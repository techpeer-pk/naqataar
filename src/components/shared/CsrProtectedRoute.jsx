import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// CSR console gate — csrAgents allowlist OR superAdmin. Mirrors
// EatsAdminProtectedRoute; see docs/CRM-Support.md.
export function CsrProtectedRoute({ children }) {
  const { user, isCsr, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/qufreecrm/login" replace />;
  // Signed-in but not on the allowlist — back to the public browse page.
  if (!isCsr && !isSuperAdmin) return <Navigate to="/index/browse" replace />;

  return children;
}
