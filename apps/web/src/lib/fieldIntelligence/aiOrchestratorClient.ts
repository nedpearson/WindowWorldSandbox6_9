// aiOrchestratorClient.ts
// Wrapper to communicate with aiOrchestrator.worker.ts

// @ts-ignore
import AiWorker from './aiOrchestrator.worker?worker';

export type AgentType = 
  | 'RUN_AGENT_2_MEASUREMENT'
  | 'RUN_AGENT_4_PRICING'
  | 'RUN_AGENT_5_CONTRACT'
  | 'RUN_AGENT_6_PHOTO'
  | 'RUN_AGENT_9_DOCUMENT';

let worker: Worker | null = null;
let messageCounter = 0;
const pendingPromises = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

export function getAiWorker(): Worker {
  if (!worker) {
    worker = new AiWorker();
    worker!.onmessage = (e) => {
      const { type, messageId, findings, error } = e.data;
      if (pendingPromises.has(messageId)) {
        const p = pendingPromises.get(messageId)!;
        if (type === 'AGENT_RESULT') {
          p.resolve(findings);
        } else {
          p.reject(new Error(error || 'Worker error'));
        }
        pendingPromises.delete(messageId);
      }
    };
  }
  return worker!;
}

export function runAgent(agentType: AgentType, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++messageCounter;
    pendingPromises.set(id, { resolve, reject });
    getAiWorker().postMessage({
      type: agentType,
      messageId: id,
      payload
    });
  });
}
