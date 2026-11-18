import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Ops console gate — eatsAdmin allowlist OR superAdmin (Directors can always
// walk into the Eats console without being on the Ops list).
export function EatsAdminProtectedRoute({ children }) {
  const { user, isEatsAdmin, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/eatsadmin/login" replace />;
  // Signed-in but not on the allowlist — back to the public Eats storefront.
  if (!isEatsAdmin && !isSuperAdmin) return <Navigate to="/qunjeeats" replace />;

  return children;
}
