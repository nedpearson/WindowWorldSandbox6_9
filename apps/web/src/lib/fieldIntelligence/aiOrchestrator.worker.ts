// aiOrchestrator.worker.ts
// Web Worker for the Synthetic AI Operations Layer
// Runs agents off the main thread to prevent UI freezing.

import { analyzeAllMeasurements } from './measurementQA';
import { analyzePricing } from './pricingQA';
import { analyzeContractReadiness } from './contractQA';
import { buildSyncFindings } from './syncQA';
import { analyzePhotos } from './photoQA';

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, messageId } = e.data;

  try {
    switch (type) {
      case 'RUN_AGENT_2_MEASUREMENT': {
        const { appointmentId, openings } = payload;
        const findings = analyzeAllMeasurements(appointmentId, openings);
        self.postMessage({ type: 'AGENT_RESULT', messageId, findings });
        break;
      }
      
      case 'RUN_AGENT_4_PRICING': {
        const { appointmentId, qa2PriceFields, openings, pricingCachedAt, financeOption } = payload;
        const findings = analyzePricing(appointmentId, { qa2PriceFields, openings, pricingCachedAt, financeOption });
        self.postMessage({ type: 'AGENT_RESULT', messageId, findings });
        break;
      }

      case 'RUN_AGENT_5_CONTRACT': {
        const { appointmentId, customer, openings, contractData, stage } = payload;
        const findings = analyzeContractReadiness(appointmentId, { customer, openings, contractData, stage });
        self.postMessage({ type: 'AGENT_RESULT', messageId, findings });
        break;
      }

      case 'RUN_AGENT_6_PHOTO': {
        const { appointmentId, openings, photos } = payload;
        const findings = analyzePhotos(appointmentId, openings, photos);
        self.postMessage({ type: 'AGENT_RESULT', messageId, findings });
        break;
      }

      case 'RUN_AGENT_9_DOCUMENT': {
        const { appointmentId, data } = payload;
        const findings = buildSyncFindings(appointmentId, data);
        self.postMessage({ type: 'AGENT_RESULT', messageId, findings });
        break;
      }

      default:
        self.postMessage({ type: 'AGENT_ERROR', messageId, error: 'Unknown agent type' });
    }
  } catch (error: any) {
    self.postMessage({ type: 'AGENT_ERROR', messageId, error: error.message });
  }
};
