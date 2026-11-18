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

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(false);

  const fetchByBusiness = useCallback(async (businessId, statusFilter = null) => {
    setLoading(true);
    try {
      const constraints = [where('businessId', '==', businessId)];
      if (statusFilter) constraints.push(where('status', '==', statusFilter));
      const snap = await getDocs(query(collection(db, 'appointments'), ...constraints));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setAppointments(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByEmail = useCallback(async (email) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'appointments'),
        where('customerEmail', '==', email.toLowerCase().trim()),
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.appointmentDatetime) - toMillis(a.appointmentDatetime));
      setAppointments(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  // Live — new bookings and status changes should show up on the admin's
  // Appointments page without a manual refresh. Twin of subscribeByEmail.
  // Returns the unsubscribe fn.
  const subscribeByBusiness = useCallback((businessId, statusFilter = null) => {
    setLoading(true);
    const constraints = [where('businessId', '==', businessId)];
    if (statusFilter) constraints.push(where('status', '==', statusFilter));
    const q = query(collection(db, 'appointments'), ...constraints);
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.appointmentDatetime) - toMillis(a.appointmentDatetime));
      setAppointments(docs);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  // Live — a business admin/superAdmin changing status (confirm, no-show,
  // cancel) should show up on My Appointments without the customer having to
  // reload. Twin of useOrders.subscribeByEmail. Returns the unsubscribe fn.
  const subscribeByEmail = useCallback((email) => {
    setLoading(true);
    const q = query(
      collection(db, 'appointments'),
      where('customerEmail', '==', email.toLowerCase().trim()),
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.appointmentDatetime) - toMillis(a.appointmentDatetime));
      setAppointments(docs);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  const fetchOne = useCallback(async (id) => {
    const snap = await getDoc(doc(db, 'appointments', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  // Note: appointment creation lives in useBooking (transactional, claims slots).

  const updateStatus = useCallback(async (id, status) => {
    await updateDoc(doc(db, 'appointments', id), { status, updatedAt: serverTimestamp() });
    setAppointments(prev =>
      prev.map(a => a.id === id ? { ...a, status } : a)
    );
  }, []);

  // Hard delete — SuperAdmin only (everyone else is blocked by firestore.rules).
  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'appointments', id));
    setAppointments(prev => prev.filter(a => a.id !== id));
  }, []);

  return { appointments, loading, fetchByBusiness, fetchByEmail, subscribeByBusiness, subscribeByEmail, fetchOne, updateStatus, remove };
}
