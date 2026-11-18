/**
 * First-visit app tour — shared state.
 *
 * - "Seen" is remembered per browser in localStorage (TOUR_KEY). Storage can
 *   be blocked (private mode, disabled site data), so every access is
 *   guarded; if it throws, the tour simply shows again next time.
 * - "Active" is in-memory only: while the tour is open, the notification and
 *   install prompts hold back (useTourActive) and show after it ends.
 */
import { useSyncExternalStore } from 'react';

export const TOUR_KEY = 'naqatar-tour-v1';

export function hasSeenTour() {
  try { return localStorage.getItem(TOUR_KEY) === 'done'; } catch { return false; }
}

export function markTourSeen() {
  try { localStorage.setItem(TOUR_KEY, 'done'); } catch { /* storage blocked — fine */ }
}

let active = false;
const listeners = new Set();

export function setTourActive(value) {
  if (active === value) return;
  active = value;
  listeners.forEach(l => l());
}

export function useTourActive() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => active,
    () => false,
  );
}
