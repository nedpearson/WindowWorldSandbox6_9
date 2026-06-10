import React, { useState, useEffect } from 'react';

export function CopilotButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [onAction, setOnAction] = useState<(() => void) | null>(null);
  
  // Instead of store, we will use location for this simple copilot layer
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    // Simple path-based inference
    const path = window.location.pathname;
    if (path.includes('sketch')) setCurrentStep(2);
    else if (path.includes('contract')) setCurrentStep(3);
    else if (path.includes('appointments')) setCurrentStep(1);
  }, []);

  useEffect(() => {
    // Basic rules engine for the Copilot
    if (currentStep === 1) {
      setSuggestion("Measure the windows. Mapbox has estimated 12 windows for this property.");
      setActionLabel("Start Measuring");
      setOnAction(() => () => console.log('Start measuring'));
    } else if (currentStep === 2) {
      setSuggestion("Take photos of the exterior to automatically detect siding/brick requirements.");
      setActionLabel("Open Camera");
      setOnAction(() => () => console.log('Open camera'));
    } else if (currentStep === 3) {
      setSuggestion("Review pricing and contract. Everything looks good.");
      setActionLabel("Review Proposal");
      setOnAction(() => () => console.log('Review Proposal'));
    } else {
      setSuggestion("Submit the job. All required fields are completed.");
      setActionLabel("Submit");
      setOnAction(() => () => console.log('Submit'));
    }
  }, [currentStep]);

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {isOpen && (
        <div 
          style={{ 
            marginBottom: 16, 
            padding: 16, 
            background: 'white', 
            borderRadius: 12, 
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            width: 300
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🤖</span> Copilot
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#4b5563' }}>
            {suggestion || "Everything looks good! Continue to the next step."}
          </p>
          {actionLabel && (
            <button 
              onClick={() => {
                if (onAction) onAction();
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '8px 16px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: '#2563eb',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24
        }}
      >
        ✨
      </button>
    </div>
  );
}
