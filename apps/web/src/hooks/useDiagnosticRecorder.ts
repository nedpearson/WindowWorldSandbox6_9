import { useEffect } from 'react';
import { globalErrorCache, consoleErrorCache } from '../diagnostics/diagnosticCollectors';

export function useDiagnosticRecorder() {
  useEffect(() => {
    // Intercept unhandled errors
    const handleWindowError = (event: ErrorEvent) => {
      globalErrorCache.frontend.push(
        `[${new Date().toISOString()}] Window Error: ${event.message} at ${event.filename}:${event.lineno}`
      );
      if (globalErrorCache.frontend.length > 50) globalErrorCache.frontend.shift();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      globalErrorCache.frontend.push(
        `[${new Date().toISOString()}] Unhandled Promise: ${reason}`
      );
      if (globalErrorCache.frontend.length > 50) globalErrorCache.frontend.shift();
    };

    // Intercept console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
      consoleErrorCache.push(`[${new Date().toISOString()}] ${msg}`);
      if (consoleErrorCache.length > 50) consoleErrorCache.shift();
      originalConsoleError.apply(console, args);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);
}
