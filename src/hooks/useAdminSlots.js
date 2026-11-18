import { useState, useCallback } from 'react';
import { collection, doc, getDocs, deleteDoc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

/** Raw slot-lock docs (businesses/{id}/slots) for the SuperAdmin console. */
export function useAdminSlots() {
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchByBusiness = useCallback(async (businessId) => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'businesses', businessId, 'slots'), orderBy('date'), orderBy('time')),
      );
      setSlots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (businessId, slotId) => {
    await deleteDoc(doc(db, 'businesses', businessId, 'slots', slotId));
    setSlots(prev => prev.filter(s => s.id !== slotId));
  }, []);

  return { slots, loading, fetchByBusiness, remove };
}
