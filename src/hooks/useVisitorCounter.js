import { useEffect, useState } from 'react';
import {
  ref, onValue, runTransaction, set, serverTimestamp,
} from 'firebase/database';
import rtdb from '../rtdb';

// Only ever reached via a dynamic import (App.jsx) or the lazy-loaded
// SuperAdmin chunk (OverviewPage) — same isolation pattern as
// useSupportChat.js, so anyone who never triggers either path never pays
// for the firebase/database SDK. See the comment in firebase.js and src/rtdb.js.

// Module-level, not per-call: a dynamic import() resolves to the same
// cached module every time, so this survives React StrictMode firing the
// mount effect twice (and any other double-invoke) within one page load —
// recordVisit() itself only ever does its writes once per real visit.
let alreadyRecorded = false;

function getVisitorId() {
  let id = localStorage.getItem('visitorId');
  if (!id) {
    id = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('visitorId', id);
  }
  return id;
}

/**
 * Records one hit against Realtime Database (total, today, unique, last
 * visit) — see database.rules.json's `visitors` node for what's enforced
 * server-side. Fire-and-forget: every write is caught and swallowed so a
 * blocked/offline write is invisible to whoever is just browsing the site.
 */
export async function recordVisit() {
  if (alreadyRecorded) return;
  alreadyRecorded = true;

  const today     = new Date().toDateString();
  const visitorId = getVisitorId();

  runTransaction(ref(rtdb, 'visitors/totalCount'), (n) => (n || 0) + 1).catch(() => {});
  runTransaction(ref(rtdb, `visitors/daily/${today}`), (n) => (n || 0) + 1).catch(() => {});
  set(ref(rtdb, 'visitors/lastVisit'), serverTimestamp()).catch(() => {});

  // Single atomic transaction on the visitor's own node decides "is this a
  // new unique visitor" — `current === null` can only be true for whichever
  // caller RTDB resolves first; any concurrent caller for the same
  // visitorId (StrictMode's double effect, two tabs opened at once, a
  // retry) sees the already-committed value on retry, not null. That's
  // what makes `wasNew` reliable enough to gate the uniqueCount bump on,
  // unlike the previous get()-then-set() version, which raced two
  // "doesn't exist yet" reads into two uniqueCount increments for one
  // visitor. serverTimestamp() can't be used inside a transaction's
  // returned value (RTDB rejects it), so this uses Date.now() instead —
  // client clock is fine for a hit counter.
  let wasNew = false;
  try {
    await runTransaction(ref(rtdb, `visitors/unique/${visitorId}`), (current) => {
      const now = Date.now();
      if (current === null) {
        wasNew = true;
        return { firstVisit: now, lastVisit: now, visitCount: 1 };
      }
      wasNew = false;
      return { ...current, lastVisit: now, visitCount: (current.visitCount || 0) + 1 };
    });
    if (wasNew) {
      await runTransaction(ref(rtdb, 'visitors/uniqueCount'), (n) => (n || 0) + 1);
    }
  } catch {
    // Anonymous write blocked (e.g. offline) — not worth surfacing to the visitor.
  }
}

/** "5m ago" / "3h ago" / "2d ago" style relative time for a lastVisit timestamp (ms). */
export function formatTimeAgo(ms) {
  if (!ms) return '—';
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/**
 * Raw daily-visit-count map (`{ "Mon Jul 21 2026": 14, ... }`) and unique-
 * visitor map (`{ visitorId: { firstVisit, lastVisit, visitCount } }`) —
 * for date-range filtering (e.g. SuperAdmin Users page's Today/Week/Month/
 * Custom filter), which the plain totals from useVisitorStats can't do.
 */
export function useVisitorLogs() {
  const [daily, setDaily] = useState({});
  const [unique, setUnique] = useState({});

  useEffect(() => {
    const unsubs = [
      onValue(ref(rtdb, 'visitors/daily'),  (s) => setDaily(s.val() || {})),
      onValue(ref(rtdb, 'visitors/unique'), (s) => setUnique(s.val() || {})),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  return { daily, unique };
}

/** Live read-only counts for the SuperAdmin Overview stat card. */
export function useVisitorStats() {
  const [stats, setStats] = useState({ total: 0, today: 0, unique: 0, lastVisit: null, loading: true });

  useEffect(() => {
    const today = new Date().toDateString();
    const unsubs = [
      onValue(ref(rtdb, 'visitors/totalCount'),        (s) => setStats((p) => ({ ...p, total: s.val() || 0, loading: false }))),
      onValue(ref(rtdb, `visitors/daily/${today}`),    (s) => setStats((p) => ({ ...p, today: s.val() || 0 }))),
      onValue(ref(rtdb, 'visitors/uniqueCount'),       (s) => setStats((p) => ({ ...p, unique: s.val() || 0 }))),
      onValue(ref(rtdb, 'visitors/lastVisit'),         (s) => setStats((p) => ({ ...p, lastVisit: s.val() || null }))),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  return stats;
}
