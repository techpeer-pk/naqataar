import { useState, useCallback } from 'react';
import {
  doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, collection, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

function toMillis(ts) {
  if (!ts) return 0;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0;
}

// Subscription invoices — one record per SuperAdmin activation/extension.
// See docs/Billing-Subscription.md. SuperAdmin-issued only; a business owner
// only ever reads their own (firestore.rules).
export function useInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')));
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByBusiness = useCallback(async (businessId) => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'invoices'), where('businessId', '==', businessId)));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setInvoices(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOne = useCallback(async (id) => {
    const snap = await getDoc(doc(db, 'invoices', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  const create = useCallback(async ({ businessId, businessName, amount, periodStart, periodEnd, createdBy }) => {
    const ref = await addDoc(collection(db, 'invoices'), {
      businessId,
      businessName,
      amount,
      periodStart: periodStart || null,
      periodEnd,
      createdBy,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }, []);

  // SuperAdmin-only (firestore.rules) — toggling `hidden` pulls an invoice
  // from the business's own /admin/invoices view without deleting it.
  const update = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'invoices', id), data);
  }, []);

  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'invoices', id));
  }, []);

  return { invoices, loading, fetchAll, fetchByBusiness, fetchOne, create, update, remove };
}
