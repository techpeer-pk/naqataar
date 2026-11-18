import { useState, useEffect } from 'react';

const THRESHOLDS = {
  excited: 15 * 60 * 1000,        // ≤ 15 min
  urgent:  60 * 60 * 1000,        // ≤ 1 hr
  calm:    24 * 60 * 60 * 1000,   // ≤ 24 hr
};

function toMs(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate().getTime();   // Firestore Timestamp
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}

function compute(targetMs) {
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, urgencyLevel: 'now', isPast: true, diff: 0 };
  }

  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);

  let urgencyLevel = 'future';
  if      (diff <= THRESHOLDS.excited) urgencyLevel = 'excited';
  else if (diff <= THRESHOLDS.urgent)  urgencyLevel = 'urgent';
  else if (diff <= THRESHOLDS.calm)    urgencyLevel = 'calm';

  return { days, hours, minutes, seconds, urgencyLevel, isPast: false, diff };
}

/**
 * Returns live countdown from now to appointmentDatetime.
 * Updates every second. Returns null if no datetime provided.
 *
 * @param {Date|Timestamp|string|null} appointmentDatetime
 * @returns {{ days, hours, minutes, seconds, urgencyLevel, isPast, diff } | null}
 */
export function useCountdown(appointmentDatetime) {
  const targetMs = toMs(appointmentDatetime);
  const [state, setState] = useState(() => targetMs ? compute(targetMs) : null);

  useEffect(() => {
    if (!targetMs) { setState(null); return; }
    setState(compute(targetMs));
    const id = setInterval(() => setState(compute(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return state;
}
