import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Operations console gate — opsTeam allowlist (any tier) OR superAdmin.
// Mirrors CsrProtectedRoute; see docs/Operations-Console.md.
export function OpsProtectedRoute({ children }) {
  const { user, isOps, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/oprations/login" replace />;
  // Signed-in but not on the allowlist — back to the public browse page.
  if (!isOps && !isSuperAdmin) return <Navigate to="/index/browse" replace />;

  return children;
}
