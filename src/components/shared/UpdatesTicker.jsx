import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import Sk from './Skeleton';
import './UpdatesTicker.css';

// Hand-managed from the Firebase Console (updates/ collection) — no
// SuperAdmin UI yet. orderBy is deliberately NOT done in the query itself:
// Firestore excludes docs missing the sorted field entirely, and these docs
// are hand-typed so `order` will often be skipped. Sort client-side instead.
export default function UpdatesTicker() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'updates'));
        const active = snap.docs
          .map(d => d.data())
          .filter(u => u.active !== false && u.message)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setMessages(active.map(u => u.message));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!loading && messages.length === 0) return null;

  if (loading) {
    return (
      <div className="updates-ticker">
        <span className="updates-ticker-label">Latest Updates:</span>
        <Sk h="1rem" w="55%" style={{ margin: '0 1.25rem' }} />
      </div>
    );
  }

  const track = messages.map((m, i) => (
    <span key={i} className="updates-ticker-item">
      {m}
      <span className="updates-ticker-sep">•</span>
    </span>
  ));

  return (
    <div className="updates-ticker">
      <span className="updates-ticker-label">Latest Updates:</span>
      <div className="updates-ticker-viewport">
        <div className="updates-ticker-track">
          <div className="updates-ticker-content">{track}</div>
          <div className="updates-ticker-content" aria-hidden="true">{track}</div>
        </div>
      </div>
    </div>
  );
}
