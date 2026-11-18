import { useState, useCallback, useEffect } from 'react';
import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

// One doc per placement (docId is the placement key, e.g. 'home',
// 'restaurants'), holding whatever image/link is currently live there.
// Simplified v0 — see docs/AdBanners-Plan.md for the fuller plan this isn't
// implementing yet (dates, pricing tiers, exclusivity enforcement).

// SuperAdmin management page — all placements at once.
export function useAdBanners() {
  const [banners, setBanners] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'adBanners'));
      const byId = {};
      snap.docs.forEach(d => { byId[d.id] = d.data(); });
      setBanners(byId);
    } finally {
      setLoading(false);
    }
  }, []);

  // Uploads a new image and (re)writes the whole doc.
  const saveImage = useCallback(async (placementId, blob, linkUrl, uid) => {
    // "promo-banners", not "ad-banners" — see storage.rules comment: a literal
    // "ad-banners" URL segment gets silently blocked by ad-blockers.
    const fileRef = ref(storage, `promo-banners/${placementId}/${Date.now()}.webp`);
    // Long-lived cache header — the filename is already unique per upload
    // (timestamped), so a new ad never collides with a stale cached one;
    // this just stops the browser re-fetching the same ad on every repeat
    // page load the way it does today with no cache-control set at all.
    await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=31536000, immutable' });
    const imageUrl = await getDownloadURL(fileRef);
    const data = { imageUrl, linkUrl: linkUrl || '', updatedAt: serverTimestamp(), updatedBy: uid };
    await setDoc(doc(db, 'adBanners', placementId), data);
    setBanners(prev => ({ ...prev, [placementId]: data }));
  }, []);

  // Updates just the link on an already-uploaded banner.
  const saveLink = useCallback(async (placementId, linkUrl) => {
    await updateDoc(doc(db, 'adBanners', placementId), { linkUrl: linkUrl || '' });
    setBanners(prev => ({ ...prev, [placementId]: { ...prev[placementId], linkUrl: linkUrl || '' } }));
  }, []);

  // Clears a placement back to the "Place your Ad here" mockup. Deletes the
  // Storage file too (best-effort — a missing/already-gone file shouldn't
  // block clearing the doc, which is the part that actually matters).
  const removeImage = useCallback(async (placementId) => {
    const imageUrl = banners[placementId]?.imageUrl;
    if (imageUrl) {
      try { await deleteObject(ref(storage, imageUrl)); } catch { /* already gone, or a stray URL — fine either way */ }
    }
    await deleteDoc(doc(db, 'adBanners', placementId));
    setBanners(prev => {
      const next = { ...prev };
      delete next[placementId];
      return next;
    });
  }, [banners]);

  // ── Ad Carousel (2026-11-17) ──
  // Same adBanners/{placementId} doc shape family, but holds an ordered
  // `slides: [{ imageUrl, linkUrl }]` array instead of one imageUrl — first
  // user is the 'findbusinessCarousel' placement on /find-business.
  const writeSlides = useCallback(async (placementId, slides, uid) => {
    const data = { slides, updatedAt: serverTimestamp(), updatedBy: uid };
    await setDoc(doc(db, 'adBanners', placementId), data);
    setBanners(prev => ({ ...prev, [placementId]: data }));
  }, []);

  const addCarouselSlide = useCallback(async (placementId, blob, linkUrl, uid) => {
    const fileRef = ref(storage, `promo-banners/${placementId}/${Date.now()}.webp`);
    await uploadBytes(fileRef, blob, { cacheControl: 'public, max-age=31536000, immutable' });
    const imageUrl = await getDownloadURL(fileRef);
    const slides = [...(banners[placementId]?.slides || []), { imageUrl, linkUrl: linkUrl || '' }];
    await writeSlides(placementId, slides, uid);
  }, [banners, writeSlides]);

  const removeCarouselSlide = useCallback(async (placementId, index, uid) => {
    const current = banners[placementId]?.slides || [];
    const imageUrl = current[index]?.imageUrl;
    if (imageUrl) {
      try { await deleteObject(ref(storage, imageUrl)); } catch { /* already gone — fine */ }
    }
    await writeSlides(placementId, current.filter((_, i) => i !== index), uid);
  }, [banners, writeSlides]);

  // Reorder / link edits — caller passes the full new slides array.
  const saveCarouselSlides = useCallback(async (placementId, slides, uid) => {
    await writeSlides(placementId, slides, uid);
  }, [writeSlides]);

  return {
    banners, loading, fetchAll, saveImage, saveLink, removeImage,
    addCarouselSlide, removeCarouselSlide, saveCarouselSlides,
  };
}

const CACHE_PREFIX = 'adBanner:';

// Best-effort — private browsing / blocked storage shouldn't crash the page,
// it just means this visit behaves like the first-ever visit (skeleton
// shows once instead of skipping straight to the cached image).
function readCache(placementId) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + placementId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeCache(placementId, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + placementId, JSON.stringify(data));
  } catch { /* storage full/blocked — nothing to do */ }
}

// Customer-facing pages — one placement, live-updating. Renders instantly
// from last visit's cached image (stale-while-revalidate) instead of
// showing a skeleton on every single page load — the Firestore round-trip
// still happens, it just updates in the background instead of blocking
// the first paint. Only a true first-ever visit (nothing cached yet) shows
// the skeleton, same as any brand-new asset would.
export function useAdBanner(placementId) {
  const cached = readCache(placementId);
  const [banner, setBanner] = useState(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'adBanners', placementId),
      snap => {
        const data = snap.exists() ? snap.data() : null;
        setBanner(data);
        setLoading(false);
        if (data) writeCache(placementId, data);
        else localStorage.removeItem(CACHE_PREFIX + placementId);
      },
      () => {
        // Read denied/failed — fall back to "no banner" instead of leaving
        // the skeleton spinning forever.
        setBanner(null);
        setLoading(false);
      },
    );
    return unsub;
  }, [placementId]);

  return { banner, loading };
}
