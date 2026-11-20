import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { enableNotifications } from '../../hooks/usePwaPushRegistration';
import './NotificationPermissionPrompt.css';
import { t } from '../../i18n';
import { useTourActive } from '../../utils/tour';

const DISMISS_KEY = 'notif-prompt-dismissed';

export default function NotificationPermissionPrompt() {
  const { user, loading } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  // Hold back while the first-visit tour is open; the 4s timer restarts after it.
  const tourActive = useTourActive();

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    // Waiting on `loading` (not just a flat 4s) matters on a cold TWA start,
    // where Firebase Auth's persisted-session restore can outlast 4s — firing
    // early meant handleEnable's `user?.uid` snapshot was still null even for
    // a tester who really was logged in, so their token saved with no uid.
    if (loading || tourActive) return;
    const timer = setTimeout(() => setShowPrompt(true), 4000);
    return () => clearTimeout(timer);
  }, [loading, tourActive]);

  const handleEnable = async () => {
    setShowPrompt(false);
    await enableNotifications(user?.uid);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem(DISMISS_KEY, 'true');
  };

  if (!showPrompt || tourActive) return null;

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
          {/* 2026-11-20: no close / "later" button (owner decision) — people
              dismissed the prompt without reading it. Only the action stays. */}
        </div>
      </div>
    </div>
  );
}
