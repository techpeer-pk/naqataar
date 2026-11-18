import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Real-time, not a one-time getDoc — an emergency shutdown must take effect
// immediately for everyone already using the app, not just on their next load.
export function useAppShutdown() {
  const [isShutdown, setIsShutdown] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'appStatus'), (snap) => {
      setIsShutdown(snap.exists() && snap.data().shutdown === true);
    }, () => setIsShutdown(false));
    return unsub;
  }, []);

  return isShutdown;
}
