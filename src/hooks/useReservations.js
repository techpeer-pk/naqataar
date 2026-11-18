import { useState, useCallback } from 'react';
import {
  doc, getDoc, updateDoc, deleteDoc, getDocs, onSnapshot,
  collection, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return 0;
}

export function useReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading]            = useState(false);

  const fetchByBusiness = useCallback(async (businessId, statusFilter = null) => {
    setLoading(true);
    try {
      const constraints = [where('businessId', '==', businessId)];
      if (statusFilter) constraints.push(where('status', '==', statusFilter));
      const snap = await getDocs(query(collection(db, 'reservations'), ...constraints));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setReservations(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByEmail = useCallback(async (email) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'reservations'),
        where('customerEmail', '==', email.toLowerCase().trim()),
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // checkIn is a "yyyy-MM-dd" string — sorts correctly lexicographically,
      // no Timestamp needed (reservations have no single datetime like an
      // appointment does).
      docs.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
      setReservations(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  // Live — a business admin/superAdmin changing status (confirm, cancel)
  // should show up on My Bookings without the customer having to reload.
  const subscribeByEmail = useCallback((email) => {
    setLoading(true);
    const q = query(
      collection(db, 'reservations'),
      where('customerEmail', '==', email.toLowerCase().trim()),
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
      setReservations(docs);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const fetchOne = useCallback(async (id) => {
    const snap = await getDoc(doc(db, 'reservations', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  // Note: reservation creation lives in useRoomBooking (transactional, claims room-nights).

  const updateStatus = useCallback(async (id, status) => {
    await updateDoc(doc(db, 'reservations', id), { status, updatedAt: serverTimestamp() });
    setReservations(prev =>
      prev.map(r => r.id === id ? { ...r, status } : r)
    );
  }, []);

  // Hard delete — SuperAdmin only (everyone else is blocked by firestore.rules).
  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'reservations', id));
    setReservations(prev => prev.filter(r => r.id !== id));
  }, []);

  return { reservations, loading, fetchByBusiness, fetchByEmail, subscribeByEmail, fetchOne, updateStatus, remove };
}
