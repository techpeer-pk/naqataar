import { useState, useCallback, useEffect } from 'react';
import {
  doc, updateDoc, deleteDoc, onSnapshot, writeBatch,
  collection, query, orderBy, where,
} from 'firebase/firestore';
import { db } from '../firebase';

// Per-user push-notification history — written server-side by
// functions/index.js (logNotification) whenever a push is sent to a
// logged-in customer. Twin of useOrders' subscribe-in-a-useEffect shape.
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const subscribe = useCallback((uid) => {
    setLoading(true);
    const q = query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const markRead = useCallback(async (uid, id, read = true) => {
    await updateDoc(doc(db, 'users', uid, 'notifications', id), { read });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read } : n));
  }, []);

  const remove = useCallback(async (uid, id) => {
    await deleteDoc(doc(db, 'users', uid, 'notifications', id));
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(async (uid, ids) => {
    const batch = writeBatch(db);
    ids.forEach(id => batch.delete(doc(db, 'users', uid, 'notifications', id)));
    await batch.commit();
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
  }, []);

  return { notifications, loading, subscribe, markRead, remove, clearAll };
}

// Lightweight sibling to useNotifications — just the unread count, for the
// bell-icon badge in Navbar. Kept separate so the navbar (mounted on every
// page) doesn't have to pull down the full notification history just to
// know whether the dot should show.
export function useUnreadNotificationCount(uid) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) { setCount(0); return; }
    const q = query(collection(db, 'users', uid, 'notifications'), where('read', '==', false));
    return onSnapshot(q, (snap) => setCount(snap.size), () => setCount(0));
  }, [uid]);

  return count;
}
