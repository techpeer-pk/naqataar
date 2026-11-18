import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function SuperProtectedRoute({ children }) {
  const { user, isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/superadmin/login" replace />;
  // Signed-in but not a superAdmin — send them to the public browse page.
  if (!isSuperAdmin) return <Navigate to="/index/browse" replace />;

  return children;
}
