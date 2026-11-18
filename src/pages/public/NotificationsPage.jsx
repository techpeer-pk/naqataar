import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogIn, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDate } from '../../utils/format';
import Sk from '../../components/shared/Skeleton';
import './NotificationsPage.css';
import { t } from '../../i18n';

export default function NotificationsPage() {
  const { user, isCustomer } = useAuth();
  const navigate = useNavigate();
  const { notifications, loading, subscribe, markRead, remove, clearAll } = useNotifications();
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (user && isCustomer) {
      setSearched(true);
      return subscribe(user.uid);
    }
  }, [user, isCustomer]);

  const handleOpen = async (n) => {
    if (!n.read) markRead(user.uid, n.id).catch(() => {});
    if (n.url) navigate(n.url);
  };

  const handleDelete = async (n) => {
    setBusyId(n.id);
    try {
      await remove(user.uid, n.id);
    } catch {
      toast.error(t('Could not delete. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(t('Clear all notifications?'))) return;
    setClearing(true);
    try {
      await clearAll(user.uid, notifications.map(n => n.id));
    } catch {
      toast.error(t('Could not clear notifications. Please try again.'));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="notifications-page page">
      <div className="container notifications-container">
        <div className="notifications-header">
          <Bell size={28} />
          <div>
            <h1>{t('My Notifications')}</h1>
            {user && isCustomer
              ? <p className="text-muted">{t('Signed in as')} <strong>{user.email}</strong></p>
              : <p className="text-muted">{t('Sign in to see your notifications.')}</p>
            }
          </div>
          {searched && !loading && notifications.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm notifications-clear-all"
              disabled={clearing}
              onClick={handleClearAll}
            >
              <Trash2 size={14} /> {clearing ? t('Clearing…') : t('Clear all')}
            </button>
          )}
        </div>

        {!(user && isCustomer) && (
          <div className="empty-state">
            <LogIn size={40} />
            <p>{t('Sign in to see your notifications.')}</p>
            <Link to="/index/login" className="btn btn-primary">{t('Sign In')}</Link>
          </div>
        )}

        {searched && loading && (
          <div className="notifications-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card"><div className="card-body">
                <Sk w="50%" h="1rem" mb="0.5rem" />
                <Sk w="70%" h="0.85rem" />
              </div></div>
            ))}
          </div>
        )}

        {searched && !loading && (
          notifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={40} />
              <p>{t('No notifications yet.')}</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map(n => (
                <div key={n.id} className={`card notification-card${n.read ? '' : ' notification-unread'}`}>
                  <div className="card-body">
                    <div className="notification-top" onClick={() => handleOpen(n)}>
                      <div>
                        {!n.read && <span className="notification-dot" />}
                        <p className="notification-title">{n.title}</p>
                        <p className="notification-body">{n.body}</p>
                        <p className="notification-time">{formatDate(n.createdAt) || t('Just now')}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm notification-delete"
                      disabled={busyId === n.id}
                      onClick={() => handleDelete(n)}
                    >
                      <X size={14} /> {busyId === n.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
