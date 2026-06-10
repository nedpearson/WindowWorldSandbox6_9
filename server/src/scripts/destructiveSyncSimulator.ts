export interface OutboxItem {
  id: number;
  entityType: string;
  localId: string;
  cloudId?: string;
  dependsOn?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  nextRetryAt?: number;
  payload: any;
}

export class SyncSimulator {
  public db: OutboxItem[] = [];
  public cloudDb = new Map<string, any>();
  public conflicts: any[] = [];
  public isOnline = true;
  
  public simulateNetworkLoss = false;
  public simulate409s = false;
  public simulateCrashes = false;
  
  private idCounter = 1;
  
  // Mock fetch
  private async dispatchFetch(item: OutboxItem) {
    if (this.simulateNetworkLoss && Math.random() > 0.5) {
      throw new Error('Network offline / Packet loss');
    }
    
    if (this.simulate409s && Math.random() > 0.8) {
      const err = new Error('Conflict');
      (err as any).isConflict = true;
      throw err;
    }

    if (this.simulateCrashes && Math.random() > 0.9) {
      throw new Error('SIMULATED_CRASH');
    }
    
    // Simulate latency
    await new Promise(r => setTimeout(r, 5));
    
    // Create in cloud DB
    const newCloudId = item.cloudId || `cloud_${item.localId}`;
    this.cloudDb.set(newCloudId, item.payload);
    return newCloudId;
  }
  
  public enqueue(entityType: string, localId: string, payload: any, dependsOn?: string) {
    this.db.push({
      id: this.idCounter++,
      entityType,
      localId,
      status: 'pending',
      retryCount: 0,
      payload,
      dependsOn
    });
  }
  
  public async drain() {
    if (!this.isOnline) return;
    
    const pending = this.db.filter(i => 
      (i.status === 'pending' || i.status === 'failed') && 
      i.retryCount < 5 &&
      (!i.nextRetryAt || i.nextRetryAt <= Date.now())
    );
    
    for (const item of pending) {
      if (!this.isOnline) break;
      
      // Check dependency
      if (item.dependsOn) {
        const parent = this.db.find(p => p.localId === item.dependsOn);
        if (parent && parent.status !== 'synced') continue; // wait for parent
      }
      
      item.status = 'syncing';
      try {
        const cloudId = await this.dispatchFetch(item);
        item.status = 'synced';
        item.cloudId = cloudId;
        
        // Remap children
        for (const child of this.db) {
          if (child.dependsOn === item.localId) {
            child.dependsOn = cloudId; // update to cloud ID
          }
        }
        
      } catch (err: any) {
        if (err.message === 'SIMULATED_CRASH') {
          // Leave it in 'syncing' status, crash the loop
          item.status = 'pending'; // In real app, IDB transaction rolls back or stays pending
          throw err;
        }
        
        item.retryCount++;
        if (err.isConflict) {
          item.status = 'conflict';
          this.conflicts.push(item);
        } else if (item.retryCount >= 5) {
          item.status = 'failed';
        } else {
          item.status = 'pending';
          item.nextRetryAt = Date.now() + 10; // short backoff for test
        }
      }
    }
  }
}

async function runTests() {
  console.log('Starting Destructive Sync Architecture Testing...');
  const sim = new SyncSimulator();
  
  // 1. Basic Enqueue & Drain
  console.log('\\n[TEST] 1. Atomic Child Dependency Resolution');
  sim.enqueue('appointment', 'loc_appt_1', { data: 1 });
  sim.enqueue('opening', 'loc_op_1', { data: 2 }, 'loc_appt_1');
  sim.enqueue('photo', 'loc_ph_1', { data: 3 }, 'loc_op_1');
  
  await sim.drain();
  const appt1 = sim.db.find(i => i.localId === 'loc_appt_1');
  const op1 = sim.db.find(i => i.localId === 'loc_op_1');
  console.log(`- Appt Status: ${appt1?.status}, Cloud ID: ${appt1?.cloudId}`);
  console.log(`- Opening Status: ${op1?.status}, Dependency Remapped To: ${op1?.dependsOn}`);
  
  // 2. Network Loss
  console.log('\\n[TEST] 2. Extreme Packet Loss & Retries');
  sim.simulateNetworkLoss = true;
  for (let i = 0; i < 50; i++) {
    sim.enqueue('customer', `loc_cust_${i}`, { name: i });
  }
  
  for (let attempt = 0; attempt < 10; attempt++) {
    await sim.drain();
    await new Promise(r => setTimeout(r, 15)); // wait for backoff
  }
  
  sim.simulateNetworkLoss = false;
  await sim.drain(); // clean up
  
  const failedItems = sim.db.filter(i => i.status === 'failed').length;
  const syncedItems = sim.db.filter(i => i.status === 'synced').length;
  console.log(`- Synced items: ${syncedItems}/${sim.db.length}`);
  console.log(`- Permanently failed items: ${failedItems}`);
  
  // 3. 409 Conflicts
  console.log('\\n[TEST] 3. Simultaneous Edits & Conflicts');
  sim.simulate409s = true;
  for (let i = 0; i < 20; i++) {
    sim.enqueue('appointment', `loc_confl_${i}`, { data: i });
  }
  await sim.drain();
  console.log(`- Conflicts detected: ${sim.conflicts.length}`);
  sim.simulate409s = false;
  
  // 4. App Crash
  console.log('\\n[TEST] 4. App Crash During Sync');
  sim.simulateCrashes = true;
  sim.enqueue('appointment', 'loc_crash_1', { data: 'important' });
  try {
    await sim.drain();
  } catch(e: any) {
    console.log(`- Crash trapped: ${e.message}`);
  }
  
  // App Restart
  console.log('- Simulating App Restart & Recovery...');
  sim.simulateCrashes = false;
  await sim.drain();
  const crashedItem = sim.db.find(i => i.localId === 'loc_crash_1');
  console.log(`- Recovered item status: ${crashedItem?.status}`);

  console.log('\\n--- TESTS COMPLETE ---');
}

runTests().catch(console.error);
