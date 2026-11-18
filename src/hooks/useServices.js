import { useState, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// onTop pins a service to the top of every list (customer-facing + admin).
// Only the SuperAdmin console writes it (BusinessDetailPage.jsx) — sorting
// here keeps every other consumer of this hook in sync automatically.
// function sortByOnTop(list) {
//   return [...list].sort((a, b) => (b.onTop ? 1 : 0) - (a.onTop ? 1 : 0));
// }

// Superseded 2026-09-24: after the onTop pin, services also sort by name with
// numbers compared as numbers ("Table for 4" < "Table for 8" < "Table for 12",
// not the plain-text 12/4/8). Before this, Firestore's default document-ID
// order made every list effectively random, and the admin list — which
// appended new services at the end — disagreed with the customer page until
// a refresh.
const byName = (a, b) => String(a.name || '').trim()
  .localeCompare(String(b.name || '').trim(), 'en', { numeric: true, sensitivity: 'base' });

function sortServices(list) {
  return [...list].sort((a, b) => ((b.onTop ? 1 : 0) - (a.onTop ? 1 : 0)) || byName(a, b));
}

export function useServices(businessId) {
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(false);

  const fetchAll = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'businesses', businessId, 'services'));
      // setServices(sortByOnTop(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      setServices(sortServices(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const create = useCallback(async (data) => {
    const ref = await addDoc(
      collection(db, 'businesses', businessId, 'services'),
      { ...data, createdAt: serverTimestamp() }
    );
    const newSvc = { id: ref.id, ...data };
    // setServices(prev => [...prev, newSvc]);
    setServices(prev => sortServices([...prev, newSvc]));
    return ref.id;
  }, [businessId]);

  const update = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'businesses', businessId, 'services', id), data);
    // setServices(prev => sortByOnTop(prev.map(s => s.id === id ? { ...s, ...data } : s)));
    setServices(prev => sortServices(prev.map(s => s.id === id ? { ...s, ...data } : s)));
  }, [businessId]);

  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'businesses', businessId, 'services', id));
    setServices(prev => prev.filter(s => s.id !== id));
  }, [businessId]);

  return { services, loading, fetchAll, create, update, remove };
}
