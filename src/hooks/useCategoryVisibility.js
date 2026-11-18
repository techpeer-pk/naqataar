import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const REF = () => doc(db, 'config', 'categoryVisibility');
const STORAGE_KEY = 'categoryVisibility:v1';

// Module-level, not component state — survives HomePageV2 unmounting on
// back-navigation (SPA route change), so a returning visit renders the
// already-known order immediately instead of flashing back to the
// hardcoded default order for a moment while a fresh onSnapshot resolves.
let cache = readCache(); // { order, hidden } | null

// Best-effort, same convention as useAdBanners.js's readCache/writeCache —
// private browsing / blocked storage shouldn't crash the page, it just
// means this visit behaves like the very first one ever (one flash
// instead of skipping straight to the cached order).
function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeCache(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full/blocked — nothing to do */ }
}

// Live, not a one-time getDoc — a SuperAdmin reorder/hide should reach
// everyone already on the home page immediately, same reasoning as
// useAppShutdown.js. `order`/`hidden` default to empty so a brand-new
// category that's never been touched from /superadmin/ads still shows
// (callers append anything missing from `order`, never drop it).
export function useCategoryVisibility() {
  const [order, setOrder] = useState(cache?.order ?? []);
  const [hidden, setHidden] = useState(cache?.hidden ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    const unsub = onSnapshot(REF(), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      const nextOrder = Array.isArray(data.order) ? data.order : [];
      const nextHidden = Array.isArray(data.hidden) ? data.hidden : [];
      cache = { order: nextOrder, hidden: nextHidden };
      writeCache(cache);
      setOrder(nextOrder);
      setHidden(nextHidden);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const saveOrder = useCallback(async (newOrder) => {
    await setDoc(REF(), { order: newOrder }, { merge: true });
  }, []);

  const toggleHidden = useCallback(async (id) => {
    const next = hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id];
    await setDoc(REF(), { hidden: next }, { merge: true });
  }, [hidden]);

  return { order, hidden, loading, saveOrder, toggleHidden };
}
