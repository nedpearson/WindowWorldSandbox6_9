// Final Review — redirects to the canonical Lockdown Review flow.
// This page was a stub that duplicated FinalLockdownReview functionality.
// Keeping it as a redirect so any existing links/bookmarks still work.
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function FinalReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const appointmentId = new URLSearchParams(location.search).get('appointmentId');

  useEffect(() => {
    if (appointmentId) {
      navigate(`/appointments/${appointmentId}/lockdown-review`, { replace: true });
    } else {
      navigate('/appointments', { replace: true });
    }
  }, [appointmentId, navigate]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Redirecting…
    </div>
  );
}
