import { useState, useCallback } from 'react';
import {
  doc, updateDoc, deleteDoc, getDocs, onSnapshot,
  collection, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return 0;
}

// QunjeeEats orders — twin of useAppointments over the top-level `orders`
// collection. Same conventions: client-side sort (no composite indexes),
// optimistic local patches. subscribeByEmail is the one exception — My
// Orders needs to reflect Ops-side status changes live, not just on reload.
export function useOrders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchByBusiness = useCallback(async (businessId, statusFilter = null) => {
    setLoading(true);
    try {
      const constraints = [where('businessId', '==', businessId)];
      if (statusFilter) constraints.push(where('status', '==', statusFilter));
      const snap = await getDocs(query(collection(db, 'orders'), ...constraints));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setOrders(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  // One-time fetch by email — CSR subject lookup (docs/CRM-Support.md) needs
  // a snapshot, not a live subscription. Twin of useAppointments.fetchByEmail.
  const fetchByEmail = useCallback(async (email) => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'orders'),
        where('customerEmail', '==', email.toLowerCase().trim()),
      ));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setOrders(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  // Live — Ops advancing an order's status should show up on the customer's
  // My Orders page without them having to reload. Returns the unsubscribe fn.
  const subscribeByEmail = useCallback((email) => {
    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('customerEmail', '==', email.toLowerCase().trim()),
    );
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setOrders(docs);
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  // Note: order creation lives in useOrderPlacement.

  // `actor` (who cancelled) is only meaningful — and only written — when
  // status is 'cancelled', so an "I didn't cancel this" dispute has a real
  // answer. See cancellation-attribution work, Sep 2026.
  const updateStatus = useCallback(async (id, status, actor) => {
    await updateDoc(doc(db, 'orders', id), {
      status,
      updatedAt: serverTimestamp(),
      ...(status === 'cancelled' && actor ? {
        cancelledByRole: actor.role,
        cancelledByUid:  actor.uid || null,
        cancelledByName: actor.name || null,
        // Optional free-text/preset reason (CancelReasonDialog) — see
        // firestore.rules' customer-cancel allowlist for the size bound.
        ...(actor.reason ? { cancelReason: actor.reason } : {}),
      } : {}),
    });
    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, status } : o)
    );
  }, []);

  // Hard delete — SuperAdmin only (everyone else is blocked by firestore.rules).
  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'orders', id));
    setOrders(prev => prev.filter(o => o.id !== id));
  }, []);

  return { orders, loading, fetchByBusiness, fetchByEmail, subscribeByEmail, updateStatus, remove };
}
