import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { Bell, X } from 'lucide-react';
import rtdb from '../../rtdb';
import './BellNotification.css';

// Only ever reached via a dynamic import (Navbar/BottomNav both React.lazy
// this whole module) so a logged-out guest's critical bundle never grows —
// same isolation pattern as usePresence.js, just triggered unconditionally
// instead of gated on being logged in, since the bell has to work for
// signed-out visitors too. See src/rtdb.js.
const LAST_SEEN_KEY = 'qunjee_notif_last_seen';

export default function BellNotification({ variant = 'navbar' }) {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    return onValue(ref(rtdb, 'notifications/latest'), (snap) => {
      const data = snap.val();
      setNotification(data);
      const lastSeen = localStorage.getItem(LAST_SEEN_KEY) || '';
      setHasUnread(!!data?.message && data.message !== lastSeen);
    });
  }, []);

  const handleOpen = () => {
    setOpen(true);
    if (notification?.message) {
      localStorage.setItem(LAST_SEEN_KEY, notification.message);
      setHasUnread(false);
    }
  };

  const handleView = () => {
    setOpen(false);
    if (notification?.url) navigate(notification.url);
  };

  return (
    <>
      <button
        type="button"
        className={variant === 'bottomnav' ? 'bottom-nav-item' : 'bell-btn'}
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <span className="bell-icon-wrap">
          <Bell size={variant === 'bottomnav' ? 20 : 18} />
          {hasUnread && <span className="bell-dot" />}
        </span>
        {variant === 'bottomnav' && <span>Updates</span>}
      </button>

      {open && notification?.message && createPortal(
        <div className="bell-overlay" onClick={() => setOpen(false)}>
          <div className="bell-card" onClick={e => e.stopPropagation()}>
            <button type="button" className="bell-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={18} />
            </button>
            <Bell size={22} className="bell-card-icon" />
            <p className="bell-card-message">{notification.message}</p>
            {notification.url && (
              <button type="button" className="btn btn-primary btn-sm" onClick={handleView}>
                View
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
