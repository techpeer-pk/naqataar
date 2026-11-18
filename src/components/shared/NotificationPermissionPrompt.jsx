import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { enableNotifications } from '../../hooks/usePwaPushRegistration';
import './NotificationPermissionPrompt.css';
import { t } from '../../i18n';

const DISMISS_KEY = 'notif-prompt-dismissed';

export default function NotificationPermissionPrompt() {
  const { user, loading } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    // Waiting on `loading` (not just a flat 4s) matters on a cold TWA start,
    // where Firebase Auth's persisted-session restore can outlast 4s — firing
    // early meant handleEnable's `user?.uid` snapshot was still null even for
    // a tester who really was logged in, so their token saved with no uid.
    if (loading) return;
    const timer = setTimeout(() => setShowPrompt(true), 4000);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleEnable = async () => {
    setShowPrompt(false);
    await enableNotifications(user?.uid);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem(DISMISS_KEY, 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="notif-prompt">
      <div className="notif-prompt-inner">
        <div className="notif-icon">
          <Bell size={22} />
        </div>
        <div className="notif-text">
          <p className="notif-title">{t('Stay Updated')}</p>
          {/* <p className="notif-sub">Get notified about your bookings & orders</p> */}
          <p className="notif-sub">{t('Get notified about your bookings')}</p>
        </div>
        <div className="notif-actions">
          <button className="btn btn-primary btn-sm" onClick={handleEnable}>
            {t('Enable')}
          </button>
          <button className="notif-close" onClick={handleDismiss} aria-label={t('Dismiss')}>
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
