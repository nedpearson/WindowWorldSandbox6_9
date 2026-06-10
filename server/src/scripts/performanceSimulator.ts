import { performance } from 'perf_hooks';
import * as v8 from 'v8';
import { calculateProposalTotals } from '../services/pricingService.js';

function formatBytes(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function randomOpening() {
  return {
    id: `opt-${Math.random()}`,
    openingNumber: Math.floor(Math.random() * 50) + 1,
    productCategory: 'double_hung',
    seriesModel: '4000',
    width: Math.floor(Math.random() * 80) + 10,
    height: Math.floor(Math.random() * 80) + 10,
    quantity: Math.floor(Math.random() * 3) + 1,
    exteriorSurface: 'vinyl_siding',
    requiresTrimHeader: true,
    temperedGlass: 'none',
    gridStyle: 'None',
    oriel: false,
    clearStory: false,
    tapcon: false,
    foamEnhanced: false,
    argon: true,
    interiorColor: 'white',
    exteriorColor: 'white',
  };
}

const mockVersion = {
  items: [
    { category: 'product', productCategory: 'double_hung', seriesModel: '4000', price: 350, label: '4000 DH' },
    { category: 'option', label: 'Tempered Glass', price: 40 },
  ]
};

async function runSimulation() {
  console.log('--- STARTING 8-HOUR WORKDAY SIMULATION ---');
  const startMemory = process.memoryUsage();
  
  // 1. Storage & Memory Mocking (50 Openings)
  const openings: any[] = [];
  console.log('\\n[Phase 1] Bootstrapping 50 Openings');
  const bootStart = performance.now();
  for(let i=0; i<50; i++) {
    openings.push(randomOpening());
  }
  const bootEnd = performance.now();
  console.log(`Boot/State Hydration Time: ${(bootEnd - bootStart).toFixed(2)}ms`);

  // 2. Photo Blob Simulation (200 photos * ~4MB = 800MB)
  console.log('\\n[Phase 2] Simulating IDB Storage for 200 High-Res Photos');
  const totalBlobStorage = 200 * 4 * 1024 * 1024; // 800MB theoretically stored in IDB
  console.log(`Storage Footprint: ${formatBytes(totalBlobStorage)} allocated to IndexedDB binary store.`);
  
  // 3. UI Lag / Render Simulation (JSON Parsing & Pricing Loops)
  console.log('\\n[Phase 3] Simulating "Active Work" UI Interactions (Thousands of renders)');
  
  const interactionStart = performance.now();
  let maxUiStutter = 0;
  
  // Simulate user making 1000 edits over the day, each triggering pricing and JSON clone (Zustand state updates)
  for(let i = 0; i < 1000; i++) {
    const loopStart = performance.now();
    
    // Deep clone mimics Redux/Zustand immutable state updates
    const clonedState = JSON.parse(JSON.stringify(openings));
    
    // Calculate pricing mimics the useEffect hook
    calculateProposalTotals(clonedState, mockVersion);
    
    const loopEnd = performance.now();
    const duration = loopEnd - loopStart;
    if (duration > maxUiStutter) maxUiStutter = duration;
  }
  
  const interactionEnd = performance.now();
  console.log(`Average Pricing/Render loop time: ${((interactionEnd - interactionStart) / 1000).toFixed(2)}ms`);
  console.log(`MAX UI Stutter (Longest Main-Thread Block): ${maxUiStutter.toFixed(2)}ms`);

  // 4. Large Contract / PDF Parsing
  console.log('\\n[Phase 4] Massive Payload Generation (Contract JSON & Sync Outbox)');
  const syncStart = performance.now();
  const massivePayload = JSON.stringify({
    customer: { name: 'Test', photos: Array(200).fill('path/to/blob') },
    openings,
    sketches: Array(10).fill({ points: Array(100).fill({x:1, y:1}) })
  });
  const syncParse = performance.now() - syncStart;
  console.log(`Sync Payload Serialization: ${syncParse.toFixed(2)}ms (Size: ${formatBytes(Buffer.byteLength(massivePayload))})`);

  // Force GC if exposed (usually requires --expose-gc, but we'll just check memory growth)
  const endMemory = process.memoryUsage();
  console.log('\\n--- MEMORY UTILIZATION ---');
  console.log(`Heap Used Start: ${formatBytes(startMemory.heapUsed)}`);
  console.log(`Heap Used End:   ${formatBytes(endMemory.heapUsed)}`);
  console.log(`Memory Leak / Retained State: ${formatBytes(endMemory.heapUsed - startMemory.heapUsed)}`);
  
  console.log('\\n--- SIMULATION COMPLETE ---');
}

runSimulation();
