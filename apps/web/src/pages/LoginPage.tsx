import { useState } from 'react';
import { useAuthStore } from '../store';
import { api } from '../utils/api';

export function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const afterLogin = () => {
    // Redirect back to intended path (e.g. /mobile/field/:id from QR scan)
    const dest = redirectTo && redirectTo !== '/' && redirectTo !== '/login' ? redirectTo : '/';
    window.location.replace(dest);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.login(email, password);
      setAuth(user, token);
      afterLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { token, user } = await api.login('demo@windowworld.com', 'demo123');
      setAuth(user, token);
      afterLogin();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const isMobileLogin = redirectTo?.startsWith('/mobile');

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1rem'
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{isMobileLogin ? '📱' : '🪟'}</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>Window World</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {isMobileLogin ? 'Field App — sign in to continue' : 'Appointment Assistant'}
          </p>
          {isMobileLogin && (
            <div style={{
              marginTop: '0.75rem', padding: '0.5rem 0.75rem',
              background: 'var(--infobg)', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: '0.75rem', color: 'var(--blue)',
            }}>
              ✓ You'll be taken to the Field App after signing in
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem',
              color: 'var(--danger)', fontSize: '0.875rem'
            }}>{error}</div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" autoComplete="username email" className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" name="password" autoComplete="current-password" className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ width: '100%' }}
            onClick={handleDemoLogin}
            disabled={loading}
          >
            Try Interactive Demo
          </button>
        </div>
      </div>
    </div>
  );
}
