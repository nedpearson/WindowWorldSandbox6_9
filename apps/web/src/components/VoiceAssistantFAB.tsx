// ═══════════════════════════════════════════════════════════════
// Voice Assistant FAB
// Floating Action Button to toggle continuous listening using 
// Web Speech API. Emits parsed intents to the app.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { parseVoiceCommand, voiceEvents } from '../utils/voiceEngine';
import { toast } from './Toast';

export function VoiceAssistantFAB() {
  if (localStorage.getItem('WWA_SHOW_ADVANCED_VOICE') !== 'true') {
    return null;
  }
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false; // Only process final chunks to avoid spamming
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('🎙️ Voice Assistant Active. "Add 36 by 80 double hung"');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const resultText = event.results[current][0].transcript.trim();
      setTranscript(resultText);

      // Normal parsing
      const parsed = parseVoiceCommand(resultText);
      if (parsed.intent !== 'unknown') {
        voiceEvents.emit(parsed);
      } else {
        toast.info(`Heard: "${resultText}" (Not understood)`);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Voice Assistant is not supported in this browser.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <>
      <button
        onClick={toggleListening}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: 56,
          height: 56,
          borderRadius: 28,
          background: isListening ? '#ef4444' : '#3b82f6',
          color: 'white',
          border: 'none',
          boxShadow: isListening ? '0 0 15px rgba(239,68,68,0.6)' : '0 4px 12px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          animation: isListening ? 'pulse 1.5s infinite' : 'none'
        }}
        title="Voice Assistant"
      >
        🎙️
      </button>

      {/* Floating Transcript Bubble */}
      {isListening && transcript && (
        <div style={{
          position: 'fixed',
          bottom: '5.5rem',
          right: '1.5rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          padding: '0.75rem',
          borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 9998,
          maxWidth: 300,
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          "{transcript}"
        </div>
      )}
    </>
  );
}
