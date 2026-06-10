// ═══════════════════════════════════════════════════════════════
// Voice Assistant Engine
// Parses natural language sales rep voice commands into actionable
// app intents.
// ═══════════════════════════════════════════════════════════════

export type VoiceIntentType = 
  | 'add_opening' 
  | 'mark_tempered' 
  | 'mark_obscure'
  | 'add_siding' 
  | 'recommend_energy' 
  | 'duplicate_opening' 
  | 'generate_proposal'
  | 'unknown';

export interface ParsedVoiceCommand {
  originalText: string;
  intent: VoiceIntentType;
  confidence: number;
  payload: Record<string, any>;
}

export function parseVoiceCommand(text: string): ParsedVoiceCommand {
  const lower = text.toLowerCase();
  
  // 1. Add Opening (e.g., "Add 36 by 80 double hung")
  if (lower.includes('add') && (lower.includes('double hung') || lower.includes('single hung') || lower.includes('door') || lower.includes('slider') || lower.includes('window'))) {
    // Basic dimension parsing "36 by 80" or "36 x 80"
    const dimMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:by|x|times)\s*(\d+(?:\.\d+)?)/);
    let width = null;
    let height = null;
    if (dimMatch) {
      width = parseFloat(dimMatch[1]);
      height = parseFloat(dimMatch[2]);
    }
    
    let type = 'double_hung';
    if (lower.includes('single hung')) type = 'single_hung';
    if (lower.includes('slider') || lower.includes('sliding')) type = 'slider';
    if (lower.includes('door')) type = 'front_door';
    if (lower.includes('patio')) type = 'patio_door';

    return {
      originalText: text,
      intent: 'add_opening',
      confidence: 0.85,
      payload: { type, width, height }
    };
  }

  // 2. Add Siding (e.g., "Add siding to rear elevation")
  if (lower.includes('add siding')) {
    let elevation = 'unknown';
    if (lower.includes('front')) elevation = 'front';
    if (lower.includes('rear') || lower.includes('back')) elevation = 'rear';
    if (lower.includes('left')) elevation = 'left';
    if (lower.includes('right')) elevation = 'right';

    return {
      originalText: text,
      intent: 'add_siding',
      confidence: 0.9,
      payload: { elevation }
    };
  }

  // 3. Mark Tempered (e.g., "Mark this as tempered")
  if (lower.includes('mark') && lower.includes('tempered')) {
    return { originalText: text, intent: 'mark_tempered', confidence: 0.95, payload: {} };
  }

  // 4. Mark Obscure (e.g., "Mark this obscure")
  if (lower.includes('mark') && lower.includes('obscure')) {
    return { originalText: text, intent: 'mark_obscure', confidence: 0.95, payload: {} };
  }

  // 5. Recommend Energy (e.g., "Recommend energy package")
  if (lower.includes('recommend') && (lower.includes('energy') || lower.includes('upgrade'))) {
    return { originalText: text, intent: 'recommend_energy', confidence: 0.9, payload: {} };
  }

  // 6. Duplicate (e.g., "Duplicate this window")
  if (lower.includes('duplicate')) {
    return { originalText: text, intent: 'duplicate_opening', confidence: 0.95, payload: {} };
  }

  // 7. Generate Proposal (e.g., "Generate proposal")
  if (lower.includes('generate proposal') || lower.includes('build proposal') || lower.includes('show quote')) {
    return { originalText: text, intent: 'generate_proposal', confidence: 0.95, payload: {} };
  }

  return {
    originalText: text,
    intent: 'unknown',
    confidence: 0,
    payload: {}
  };
}

// Global Event Emitter for Voice Commands (to decouple UI components)
type VoiceListener = (cmd: ParsedVoiceCommand) => void;
const listeners = new Set<VoiceListener>();

export const voiceEvents = {
  subscribe: (listener: VoiceListener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  emit: (cmd: ParsedVoiceCommand) => {
    listeners.forEach(l => l(cmd));
  }
};
