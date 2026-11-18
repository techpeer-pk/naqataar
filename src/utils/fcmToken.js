import * as Sentry from '@sentry/react';
import { getMessagingInstance } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Registered at a dedicated scope so it doesn't fight the vite-plugin-pwa
// service worker, which controls the root "/" scope.
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

// Every early-return below used to be a silent null with no way to tell
// "user said no" apart from "VAPID key missing" or "SW registration threw" —
// which made the low opt-in→registered conversion rate (12 closed testers,
// 3 pushTokens docs) undiagnosable. console.warn covers debugging over
// chrome://inspect on a connected test device even before VITE_SENTRY_DSN
// is set; Sentry.captureMessage is a no-op until then but starts working
// for free once it is.
function bail(reason, extra) {
  console.warn(`[FCM] registration skipped: ${reason}`, extra || '');
  Sentry.captureMessage(`FCM registration skipped: ${reason}`, { level: 'info', extra });
  return null;
}

/**
 * Asks for notification permission and returns this device's FCM token, or
 * null (unsupported browser, permission denied, VAPID key missing). Callers
 * save the token wherever the Cloud Function triggers expect it — the
 * appointment or order doc.
 */
export async function requestFcmToken() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return bail('unsupported-browser');

  let permission;
  try {
    permission = await Notification.requestPermission();
  } catch (err) {
    return bail('permission-request-threw', { message: err?.message });
  }
  if (permission !== 'granted') return bail('permission-not-granted', { permission });

  const messaging = await getMessagingInstance();
  if (!messaging) return bail('no-messaging-instance');
  if (!VAPID_KEY) return bail('missing-vapid-key');

  try {
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: FCM_SW_SCOPE });
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swRegistration });
    return token || bail('get-token-returned-empty');
  } catch (err) {
    console.warn('[FCM] requestFcmToken threw', err);
    Sentry.captureException(err, { tags: { source: 'requestFcmToken' } });
    return null;
  }
}
