import { useState, useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useFaqs() {
  const [faqs, setFaqs]     = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'faqs'), orderBy('order', 'asc')));
      setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (data) => {
    const ref = await addDoc(collection(db, 'faqs'), { ...data, createdAt: serverTimestamp() });
    setFaqs(prev => [...prev, { id: ref.id, ...data }]);
    return ref.id;
  }, []);

  const update = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'faqs', id), { ...data, updatedAt: serverTimestamp() });
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
  }, []);

  const remove = useCallback(async (id) => {
    await deleteDoc(doc(db, 'faqs', id));
    setFaqs(prev => prev.filter(f => f.id !== id));
  }, []);

  return { faqs, loading, fetchAll, create, update, remove };
}
