import { useCallback } from 'react';
import {
  ref, onValue, push, set, update, serverTimestamp, get,
} from 'firebase/database';
import rtdb from '../rtdb';

// Only ever imported by lazy-loaded chat UI (SupportChatWidget, CSR's
// LiveChatPage) — keeping the `firebase/database` import out of the shared
// firebase.js is what lets this whole SDK stay out of the main bundle. See
// the comment in firebase.js and src/rtdb.js.

/**
 * Live support chat — Realtime Database, not Firestore (see
 * docs/CRM-Support.md). One chat thread per person, keyed by their own uid:
 *   supportChats/{uid}/meta      -> { subjectType, subjectId, subjectName, subjectEmail, status, createdAt, lastMessageAt, lastMessagePreview, lastSenderRole }
 *   supportChats/{uid}/messages/{pushId} -> { senderId, senderRole, senderName, text, createdAt }
 *
 * Access is enforced in database.rules.json: a signed-in user only ever
 * reads/writes their own uid's node; CSR/superAdmin (mirrored into RTDB —
 * see NavigationRoutes.md §6) can read/write all of them, which is what
 * powers the live queue in /qufreecrm.
 */
export function useSupportChat() {
  // Creates the chat's meta node the first time someone opens the widget;
  // a no-op (via update, not overwrite) if it already exists, so reopening
  // the widget later doesn't reset status back to 'open' unnecessarily...
  // actually it SHOULD reopen a closed chat if the person starts typing
  // again, so this always sets status to 'open'.
  const ensureChatStarted = useCallback(async ({ uid, subjectType, name, email }) => {
    const metaRef = ref(rtdb, `supportChats/${uid}/meta`);
    const snap = await get(metaRef);
    if (!snap.exists()) {
      await set(metaRef, {
        subjectType,
        subjectId: uid,
        subjectName: name || '',
        subjectEmail: email || '',
        status: 'open',
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessagePreview: '',
        lastSenderRole: null,
      });
    } else if (snap.val().status === 'closed') {
      await update(metaRef, { status: 'open' });
    }
  }, []);

  const sendMessage = useCallback(async ({ chatId, senderId, senderRole, senderName, text }) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const messagesRef = ref(rtdb, `supportChats/${chatId}/messages`);
    const newRef = push(messagesRef);
    await set(newRef, {
      senderId,
      senderRole,
      senderName: senderName || '',
      text: trimmed,
      createdAt: serverTimestamp(),
    });
    await update(ref(rtdb, `supportChats/${chatId}/meta`), {
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: trimmed.slice(0, 120),
      lastSenderRole: senderRole,
      status: 'open',
    });
  }, []);

  // Live subscription to one chat's messages, newest last (insertion order —
  // RTDB push keys are chronological). Returns the unsubscribe function.
  const subscribeToMessages = useCallback((chatId, callback) => {
    const messagesRef = ref(rtdb, `supportChats/${chatId}/messages`);
    return onValue(messagesRef, (snap) => {
      const val = snap.val() || {};
      const messages = Object.entries(val)
        .map(([id, m]) => ({ id, ...m }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      callback(messages);
    });
  }, []);

  const subscribeToMeta = useCallback((chatId, callback) => {
    const metaRef = ref(rtdb, `supportChats/${chatId}/meta`);
    return onValue(metaRef, (snap) => callback(snap.val()));
  }, []);

  // CSR queue — every chat's meta, newest activity first. Small dataset
  // (a handful of concurrent support conversations), so plain client-side
  // sort is enough — no RTDB query/index needed, same convention this app
  // already uses for Firestore lists (see useAppointments.js).
  const subscribeToQueue = useCallback((callback) => {
    const chatsRef = ref(rtdb, 'supportChats');
    return onValue(chatsRef, (snap) => {
      const val = snap.val() || {};
      const chats = Object.entries(val)
        .map(([id, c]) => ({ id, ...c.meta }))
        .filter(c => c.subjectId)
        .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      callback(chats);
    });
  }, []);

  const closeChat = useCallback(async (chatId) => {
    await update(ref(rtdb, `supportChats/${chatId}/meta`), { status: 'closed' });
  }, []);

  return { ensureChatStarted, sendMessage, subscribeToMessages, subscribeToMeta, subscribeToQueue, closeChat };
}
