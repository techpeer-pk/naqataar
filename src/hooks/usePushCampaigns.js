import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/** Live list of pushCampaigns docs — campaignPush writes sent/failed/status back onto the same doc. */
export function usePushCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'pushCampaigns'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const send = useCallback(async ({ title, body, url }) => {
    const ref = await addDoc(collection(db, 'pushCampaigns'), {
      title,
      body: body || '',
      url: url || '/index',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }, []);

  return { campaigns, loading, send };
}
