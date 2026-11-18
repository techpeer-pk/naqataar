import { useState, useCallback } from 'react';
import {
  doc, getDoc, addDoc, updateDoc, getDocs,
  collection, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return 0;
}

// CSR case log — see docs/CRM-Support.md. Phase A: CSR's only write surface,
// they never touch appointments/orders/users/businesses directly.
export function useSupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'supportTickets'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setTickets(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBySubject = useCallback(async (subjectId) => {
    const snap = await getDocs(query(collection(db, 'supportTickets'), where('subjectId', '==', subjectId)));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    return docs;
  }, []);

  const fetchOne = useCallback(async (id) => {
    const snap = await getDoc(doc(db, 'supportTickets', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  const create = useCallback(async (data) => {
    const actor = auth.currentUser;
    const ref = await addDoc(collection(db, 'supportTickets'), {
      ...data,
      status: 'open',
      createdBy: actor?.uid || null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }, []);

  const update = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'supportTickets', id), { ...data, updatedAt: serverTimestamp() });
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);

  return { tickets, loading, fetchAll, fetchBySubject, fetchOne, create, update };
}
