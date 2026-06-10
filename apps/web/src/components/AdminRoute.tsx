import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import type { ReactNode } from 'react';

const ADMIN_ROLES = ['admin', 'manager', 'owner', 'super_admin'];

interface AdminRouteProps {
  children: ReactNode;
  /** When true, only super_admin can access (e.g. AI usage, finance catalog import) */
  superAdminOnly?: boolean;
}

/**
 * Wraps a route that should only be accessible to admins/managers.
 * Sales reps who navigate directly to the URL are silently redirected to /.
 * The backend API is also protected — this is defence-in-depth for UX.
 */
export function AdminRoute({ children, superAdminOnly = false }: AdminRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/" replace />;

  const allowed = superAdminOnly
    ? user.role === 'super_admin'
    : ADMIN_ROLES.includes(user.role ?? '');

  if (!allowed) return <Navigate to="/" replace />;

  return <>{children}</>;
}
