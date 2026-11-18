import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * SuperAdmin-only: live list of pushTokens/ (see firestore.rules — read is
 * isSuperAdmin() only). Each row is annotated with the owning user's email,
 * looked up via its `uid` field — `uid` itself is just whoever was last
 * logged in on that device (see project memory), not a stable identity, but
 * it's the only link back to a person this collection has.
 */
export function usePushTokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'pushTokens'), orderBy('lastSeenAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const uids = [...new Set(rows.filter(r => r.uid).map(r => r.uid))];
      const emailByUid = {};
      await Promise.all(uids.map(async (uid) => {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          emailByUid[uid] = userSnap.exists() ? userSnap.data().email : null;
        } catch {
          emailByUid[uid] = null;
        }
      }));
      setTokens(rows.map(r => ({ ...r, email: r.uid ? emailByUid[r.uid] : null })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  return { tokens, loading };
}
