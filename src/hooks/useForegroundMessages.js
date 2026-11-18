import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { getMessagingInstance } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Shows a toast for FCM pushes that arrive while the tab is open/focused.
 * Background pushes (tab hidden or app closed) are handled by
 * public/firebase-messaging-sw.js instead.
 */
export function useForegroundMessages() {
  useEffect(() => {
    if (!VAPID_KEY) return;
    let unsubscribe;

    (async () => {
      const messaging = await getMessagingInstance();
      if (!messaging) return;

      const { onMessage } = await import('firebase/messaging');
      unsubscribe = onMessage(messaging, (payload) => {
        // Functions send data-only payloads; notification kept as fallback.
        const { title, body } = payload.data || payload.notification || {};
        toast(body || title || 'New notification', { icon: '🔔' });
      });
    })();

    return () => unsubscribe?.();
  }, []);
}
