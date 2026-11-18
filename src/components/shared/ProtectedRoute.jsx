import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../i18n';

export function ProtectedRoute({ children }) {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('Loading…')}</p>
      </div>
    );
  }

  // Must be logged in AND have businessAdmin role
  if (!user || userProfile?.role !== 'businessAdmin') {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
