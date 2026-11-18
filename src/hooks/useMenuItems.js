import { useState, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// QunjeeEats menu — twin of useServices, over businesses/{id}/menuItems.
export function useMenuItems(businessId) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading]     = useState(false);

  const fetchAll = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'businesses', businessId, 'menuItems'));
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  const create = useCallback(async (data) => {
    const ref = await addDoc(
      collection(db, 'businesses', businessId, 'menuItems'),
      { isAvailable: true, ...data, createdAt: serverTimestamp() }
    );
    const newItem = { id: ref.id, isAvailable: true, ...data };
    setMenuItems(prev => [...prev, newItem]);
    return ref.id;
  }, [businessId]);

  const update = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'businesses', businessId, 'menuItems', id), data);
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
  }, [businessId]);

  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'businesses', businessId, 'menuItems', id));
    setMenuItems(prev => prev.filter(m => m.id !== id));
  }, [businessId]);

  return { menuItems, loading, fetchAll, create, update, remove };
}
