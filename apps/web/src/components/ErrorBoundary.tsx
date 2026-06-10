import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Context label for error logging */
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Production-grade error boundary.
 * - Prevents blank screens from component crashes
 * - Shows clear recovery options (Retry, Dashboard, Field Flow)
 * - Logs errors to localStorage for admin review
 * - Handles chunk loading errors from code-split updates
 * - Never exposes stack traces to normal users
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ errorInfo: info });
    console.error('[ErrorBoundary]', error, info.componentStack);

    import('../utils/productionGuards').then(({ logError }) => {
      logError({
        level: 'error',
        category: 'route',
        message: `${this.props.context || 'Component'} crashed: ${error.message}`,
        technicalDetail: `${error.stack}\n\nComponent Stack:\n${info.componentStack}`,
      });
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const error = this.state.error;
      const isChunkError = error?.message?.match(/Failed to fetch dynamically imported module/i) || 
                           error?.message?.match(/Importing a module script failed/i);
      const isNetworkError = error?.message?.match(/NetworkError|fetch|Failed to fetch|Load failed/i);

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: '1rem',
          padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{ fontSize: '3rem' }}>
            {isChunkError ? '🔄' : isNetworkError ? '📡' : '⚠️'}
          </div>
          <h2 style={{ color: 'var(--text-primary, #e5e7eb)', margin: 0, fontSize: '1.25rem' }}>
            {isChunkError ? 'App Update Available' 
              : isNetworkError ? 'Connection Issue'
              : 'Something went wrong'}
          </h2>
          <p style={{ 
            color: 'var(--text-secondary, #9ca3af)', maxWidth: 420, 
            fontSize: '0.875rem', lineHeight: 1.5, margin: 0,
          }}>
            {isChunkError 
              ? 'A new version was just deployed. Please reload to get the latest version.' 
              : isNetworkError
              ? 'We couldn\'t connect to the server. Please check your connection and try again.'
              : 'An unexpected error occurred. Your work has been auto-saved.'}
          </p>

          {/* Recovery Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
            {/* Primary: Retry */}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                if (isChunkError && 'serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (let registration of registrations) {
                      registration.unregister();
                    }
                    window.location.reload();
                  });
                } else {
                  window.location.reload();
                }
              }}
              style={{
                padding: '0.625rem 1.5rem', borderRadius: 8,
                background: 'var(--accent, #3b82f6)', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600,
                minWidth: 44, minHeight: 44,
              }}
            >
              {isChunkError ? '🔄 Load New Version' : '🔄 Retry'}
            </button>

            {/* Go to Dashboard */}
            <button
              onClick={() => { window.location.href = '/'; }}
              style={{
                padding: '0.625rem 1.25rem', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border, #374151)',
                color: 'var(--text-secondary, #9ca3af)', cursor: 'pointer',
                fontSize: '0.8125rem', fontWeight: 500,
                minWidth: 44, minHeight: 44,
              }}
            >
              📊 Dashboard
            </button>

            {/* Go to Appointments */}
            <button
              onClick={() => { window.location.href = '/appointments'; }}
              style={{
                padding: '0.625rem 1.25rem', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border, #374151)',
                color: 'var(--text-secondary, #9ca3af)', cursor: 'pointer',
                fontSize: '0.8125rem', fontWeight: 500,
                minWidth: 44, minHeight: 44,
              }}
            >
              📅 Appointments
            </button>
          </div>

          {/* Context info for admins */}
          {this.props.context && (
            <div style={{ 
              marginTop: '1rem', fontSize: '0.6875rem', 
              color: 'var(--text-muted, #6b7280)',
              padding: '0.5rem 1rem', borderRadius: 6,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border, #374151)',
              maxWidth: 400,
            }}>
              Area: {this.props.context} · {new Date().toLocaleTimeString()}
              {error && <span> · Ref: {error.message.slice(0, 50)}</span>}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
