import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

// Auto sign-out for PRIVILEGED consoles only (businessAdmin + the four internal
// consoles). Customers are deliberately left on Firebase's long persistence —
// forcing them to re-login hurts conversion and their risk is lower. This is
// client-side only: worst case is a privileged user re-logging in, never a
// security downgrade, and it touches no rules/data.
//
// Two independent cut-offs, whichever hits first:
//   • IDLE      — no interaction for 60 min  → sign out (covers "closed the PC")
//   • ABSOLUTE  — 24h since the last real login → sign out (covers a browser
//                 left open for days). Anchored to the auth token's authTime,
//                 so a plain token refresh can't extend it and a reload can't
//                 reset it.
const IDLE_MS     = 60 * 60 * 1000;        // 60 minutes
const ABSOLUTE_MS = 24 * 60 * 60 * 1000;   // 24 hours

export function useIdleLogout(enabled) {
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!enabled) return;
    lastActivity.current = Date.now();

    let authTime = Date.now();
    auth.currentUser?.getIdTokenResult()
      .then(r => { authTime = new Date(r.authTime).getTime(); })
      .catch(() => {});

    const bump = () => { lastActivity.current = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, bump, { passive: true }));

    const timer = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity.current >= IDLE_MS || now - authTime >= ABSOLUTE_MS) {
        signOut(auth).catch(() => {});   // protected routes redirect to login on their own
      }
    }, 30 * 1000);   // check every 30s

    return () => {
      events.forEach(e => window.removeEventListener(e, bump));
      clearInterval(timer);
    };
  }, [enabled]);
}
