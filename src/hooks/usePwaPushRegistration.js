import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, getMessagingInstance } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { requestFcmToken } from '../utils/fcmToken';

// Set when the user explicitly disables notifications from Profile — without
// this, the heartbeat effect below would silently re-register a token on the
// next visit since it only looks at Notification.permission, which browsers
// never let JS revoke back to 'default'.
export const NOTIF_OPT_OUT_KEY = 'notif-opt-out';

async function saveToken(token, uid) {
  try {
    await setDoc(doc(db, 'pushTokens', token), {
      token,
      userAgent: navigator.userAgent.slice(0, 200),
      lastSeenAt: serverTimestamp(),
      ...(uid ? { uid } : {}),
    }, { merge: true });
  } catch (err) {
    // Offline or rules hiccup — retried on next launch.
    console.warn('[FCM] saveToken failed', err);
    Sentry.captureException(err, { tags: { source: 'pushTokens-saveToken' } });
  }
}

/**
 * Heartbeats pushTokens/ on every visit, but only once permission was
 * already granted in an earlier session — never auto-fires the permission
 * request itself. Chrome silently suppresses notification prompts not tied
 * to a user gesture (falls back to a small address-bar icon), and a TWA has
 * no address bar for that fallback to appear on, so the first-ever ask has
 * to come from an explicit tap — see NotificationPermissionPrompt.
 */
export function usePwaPushRegistration() {
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (localStorage.getItem(NOTIF_OPT_OUT_KEY) === 'true') return;
    // user set but userProfile not (yet) — either the Firestore profile
    // fetch is still in flight, or this is a Google sign-in that Auth
    // briefly authenticated before AuthContext rejected it (e.g. Business
    // Login with no registered account) and is about to sign back out.
    // Wait rather than tag pushTokens with a uid that may never get a
    // users/ doc — see project memory on the "Unknown user" pushTokens bug.
    if (user && !userProfile) return;
    (async () => {
      const token = await requestFcmToken();
      if (token) await saveToken(token, user?.uid);
    })();
  }, [user?.uid, userProfile]);
}

/** Explicit, user-gesture-triggered permission ask + token registration. */
export async function enableNotifications(uid) {
  const token = await requestFcmToken();
  if (token) {
    localStorage.removeItem(NOTIF_OPT_OUT_KEY);
    await saveToken(token, uid);
  }
  return token;
}

/**
 * Stops this device from receiving pushes. Can't revoke the browser's
 * Notification permission itself (no JS API for that) — only the user can do
 * that from browser/site settings — so this deletes the device's token
 * server-side and flags opt-out locally so the heartbeat effect above
 * doesn't quietly re-register it on the next visit.
 */
export async function disableNotifications() {
  localStorage.setItem(NOTIF_OPT_OUT_KEY, 'true');
  try {
    // Notification.permission is already 'granted' at this point, so this
    // just re-resolves the existing token/SW registration — no dialog.
    const token = await requestFcmToken();
    if (!token) return;
    await deleteDoc(doc(db, 'pushTokens', token)).catch(() => {});
    const messaging = await getMessagingInstance();
    if (messaging) {
      const { deleteToken } = await import('firebase/messaging');
      await deleteToken(messaging);
    }
  } catch (err) {
    console.warn('[FCM] disableNotifications failed', err);
    Sentry.captureException(err, { tags: { source: 'disableNotifications' } });
  }
}
