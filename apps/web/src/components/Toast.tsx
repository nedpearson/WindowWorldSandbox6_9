import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

// ─── Types ───────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

// ─── Hook ────────────────────────────────────────────────
export function useToast() {
  return useContext(ToastContext);
}

// ─── Imperative toast (callable anywhere, not just inside React) ──
// Backed by a singleton reference that the provider sets.
let _globalShowToast: ((message: string, type?: ToastType, duration?: number) => void) | null = null;

/** Call toast() from anywhere — components, utils, catch blocks, etc. */
export function toast(message: string, type: ToastType = 'info', duration: number = 4000) {
  if (_globalShowToast) {
    _globalShowToast(message, type, duration);
  } else {
    // Fallback if provider hasn't mounted yet (rare)
    console.warn(`[Toast] ${type}: ${message}`);
  }
}

/** Shorthand helpers */
toast.success = (msg: string, duration?: number) => toast(msg, 'success', duration);
toast.error = (msg: string, duration?: number) => toast(msg, 'error', duration ?? 5000);
toast.warning = (msg: string, duration?: number) => toast(msg, 'warning', duration);
toast.info = (msg: string, duration?: number) => toast(msg, 'info', duration);

// ─── Provider ────────────────────────────────────────────
let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3500) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  // Wire up the imperative global
  useEffect(() => {
    _globalShowToast = showToast;
    return () => { _globalShowToast = null; };
  }, [showToast]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 400 }}>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Individual Toast ────────────────────────────────────
const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: '✅' },
  error:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: '❌' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '⚠️' },
  info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: 'ℹ️' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const style = TYPE_STYLES[toast.type];

  return (
    <div
      onClick={() => onDismiss(toast.id)}
      style={{
        background: 'var(--bg-card, #1c2333)',
        border: `1px solid ${style.border}`,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: 10,
        padding: '0.75rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--text-primary, #e5e7eb)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        cursor: 'pointer',
        animation: 'slideIn 0.25s ease',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {style.icon} {toast.message}
    </div>
  );
}

