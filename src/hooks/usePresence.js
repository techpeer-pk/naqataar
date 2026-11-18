import { useEffect, useState } from 'react';
import {
  ref, set, remove, push, onValue, onDisconnect, serverTimestamp,
} from 'firebase/database';
import rtdb from '../rtdb';

// Only ever reached via a dynamic import (App.jsx, gated on being logged in)
// or the lazy-loaded SuperAdmin chunk (UsersPage/BusinessesPage) — same
// isolation pattern as useSupportChat.js/useVisitorCounter.js, so a logged-
// out visitor never pays for the firebase/database SDK. See firebase.js and
// src/rtdb.js.

/**
 * Write side — call once per authenticated (customer/business-admin)
 * session. Tracks this tab/device as one entry under status/{uid}/connections
 * so that closing one of several open tabs doesn't flip the user to
 * "offline" while another tab is still connected. Re-registers on every
 * `.info/connected` flip to true (not just the first), since a reconnect is
 * a new socket and any onDisconnect() registered on the old one is already
 * spent — this is Firebase's documented presence caveat, not app-specific.
 *
 * Returns a cleanup function that removes this connection and stamps
 * lastSeen immediately, so logout goes offline right away instead of
 * waiting on the server to notice the socket dropped.
 */
export function trackPresence(uid, basePath = 'status') {
  const lastSeenRef = ref(rtdb, `${basePath}/${uid}/lastSeen`);
  let myConnRef = null;

  const unsubConnected = onValue(ref(rtdb, '.info/connected'), (snap) => {
    if (snap.val() !== true) return;
    myConnRef = push(ref(rtdb, `${basePath}/${uid}/connections`));
    onDisconnect(myConnRef).remove();
    onDisconnect(lastSeenRef).set(serverTimestamp());
    set(myConnRef, { connectedAt: serverTimestamp() });
  });

  return () => {
    unsubConnected();
    if (myConnRef) remove(myConnRef).catch(() => {});
    set(lastSeenRef, serverTimestamp()).catch(() => {});
  };
}

/**
 * Explicit "go offline now" — called from AuthContext.logout() BEFORE
 * signOut(). Matters because the RTDB write rule requires being
 * authenticated as this uid: once signOut() has completed, a cleanup
 * remove() fired afterwards (e.g. from trackPresence's effect-cleanup,
 * triggered by `user` turning null) is already unauthenticated and gets
 * silently rejected — the dot then only clears via the server-side
 * onDisconnect() TCP timeout, tens of seconds later instead of instantly.
 *
 * Clears every connection for this uid, not just the calling tab's —
 * acceptable since logout is a deliberate, whole-account action; the same
 * account open in another tab will self-heal on that tab's next
 * .info/connected reconnect.
 */
export function stopPresence(uid, basePath = 'status') {
  return Promise.all([
    remove(ref(rtdb, `${basePath}/${uid}/connections`)).catch(() => {}),
    set(ref(rtdb, `${basePath}/${uid}/lastSeen`), serverTimestamp()).catch(() => {}),
  ]);
}

/** Read side — SuperAdmin only (enforced in database.rules.json). */
export function useIsOnline(uid) {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = onValue(ref(rtdb, `status/${uid}/connections`), (snap) => {
      setOnline(snap.exists() && snap.hasChildren());
    });
    return unsub;
  }, [uid]);

  return online;
}

/**
 * Map of uid -> lastSeen (ms since epoch) for every uid under status/ —
 * SuperAdmin only (enforced in database.rules.json). One listener for the
 * whole node, same pattern as useLiveUserCount, so a table of many users
 * doesn't need one lastSeen listener per row.
 */
export function useLastSeenMap() {
  const [map, setMap] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'status'), (snap) => {
      const next = {};
      snap.forEach((child) => {
        const lastSeen = child.child('lastSeen').val();
        if (lastSeen) next[child.key] = lastSeen;
      });
      setMap(next);
    });
    return unsub;
  }, []);

  return map;
}

/**
 * Map of uid -> earliest connectedAt (ms) among that uid's currently-open
 * connections — SuperAdmin only (enforced in database.rules.json). Only
 * present for uids that are online right now (mirrors useIsOnline: a uid
 * with no connections is simply absent from the map). The earliest of
 * possibly-several tabs' connectedAt is the start of the current unbroken
 * "online" streak, so `Date.now() - map[uid]` is that streak's live length;
 * it self-resets once every connection drops and the next one opens a
 * fresh push key with a new connectedAt.
 */
export function useSessionStartMap() {
  const [map, setMap] = useState({});

  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'status'), (snap) => {
      const next = {};
      snap.forEach((child) => {
        let earliest = null;
        child.child('connections').forEach((conn) => {
          const t = conn.child('connectedAt').val();
          if (t && (earliest === null || t < earliest)) earliest = t;
        });
        if (earliest) next[child.key] = earliest;
      });
      setMap(next);
    });
    return unsub;
  }, []);

  return map;
}

/**
 * Aggregate count of currently-online (logged-in) users, across every uid
 * under status/ — SuperAdmin only (enforced in database.rules.json).
 *
 * `allowedUids`, if given, restricts the count to that set (e.g. business
 * owners only, on the Businesses page) instead of every online customer +
 * business admin. Pass a stable array/Set reference — a new one every
 * render would resubscribe on every render.
 */
export function useLiveUserCount(allowedUids) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const filterSet = allowedUids ? new Set(allowedUids) : null;
    const unsub = onValue(ref(rtdb, 'status'), (snap) => {
      let n = 0;
      snap.forEach((child) => {
        if (filterSet && !filterSet.has(child.key)) return;
        const conns = child.child('connections');
        if (conns.exists() && conns.hasChildren()) n++;
      });
      setCount(n);
    });
    return unsub;
  }, [allowedUids]);

  return count;
}
