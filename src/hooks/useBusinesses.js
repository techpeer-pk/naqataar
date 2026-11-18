import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { stripCountryCode } from '../utils/validation';

// Every spelling the free-form business `phone` field has been saved in
// (AdminRegister's placeholder is "03XX-XXXXXXX", newer forms store
// "92XXXXXXXXXX") — lets fetchByPhone hit an indexed `in` query first.
function phoneVariants(local) {
  const a = local.slice(0, 3), b = local.slice(3);
  return [...new Set([
    local, `0${local}`, `92${local}`, `+92${local}`,
    `0${a}-${b}`, `0${a} ${b}`, `92${a}-${b}`, `92 ${a} ${b}`,
    `+92${a}-${b}`, `+92 ${a} ${b}`, `+92-${a}-${b}`, `+92 ${local}`,
  ])];
}

const TRIAL_DAYS = 30;

export function useBusinesses() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(false);

  const fetchAll = useCallback(async (type = null) => {
    setLoading(true);
    try {
      const ref = collection(db, 'businesses');
      const q = type
        ? query(ref, where('type', '==', type), where('isActive', '==', true))
        : query(ref, where('isActive', '==', true));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setBusinesses(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOne = useCallback(async (id) => {
    const snap = await getDoc(doc(db, 'businesses', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  // Public "find by business number" lookup — returns every ACTIVE business
  // whose phone matches (usually 0 or 1, can be more if one owner reuses a
  // number). Indexed exact-variant query first; if that misses (number saved
  // in some odd spelling), falls back to scanning active businesses and
  // comparing normalized digits. isActive==true is in both queries because
  // firestore.rules only lets the public read active businesses.
  const fetchByPhone = useCallback(async (input) => {
    const local = stripCountryCode(input);
    if (!local) return [];
    const ref = collection(db, 'businesses');
    const snap = await getDocs(query(ref, where('isActive', '==', true), where('phone', 'in', phoneVariants(local))));
    if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const all = await getDocs(query(ref, where('isActive', '==', true)));
    return all.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(b => stripCountryCode(b.phone) === local);
  }, []);

  const fetchByAdmin = useCallback(async (adminUid) => {
    const q = query(collection(db, 'businesses'), where('adminUid', '==', adminUid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))[0] || null;
  }, []);

  // New businesses (self-registered or added by SuperAdmin) get a free
  // TRIAL_DAYS window before a subscription is required — see docs/Billing-
  // Subscription.md. Existing businesses have neither field at all, which
  // subscriptionStatus() below treats as always-active, so nothing already
  // registered is retroactively affected.
  const create = useCallback(async (data) => {
    const trialEndsAt = Timestamp.fromDate(new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000));
    const ref = await addDoc(collection(db, 'businesses'), {
      ...data,
      // Callers can opt into isActive: false (self-serve registration does,
      // to hold a new business out of public listings until a SuperAdmin
      // approves it) — everyone else who doesn't pass it keeps today's
      // immediate-active behavior.
      isActive: data.isActive ?? true,
      trialEndsAt,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }, []);

  const update = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'businesses', id), { ...data, updatedAt: serverTimestamp() });
  }, []);

  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'businesses', id));
  }, []);

  return { businesses, loading, fetchAll, fetchOne, fetchByAdmin, fetchByPhone, create, update, remove };
}
