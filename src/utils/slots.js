/**
 * Pure slot-logic helpers — no Firebase, no React.
 * Kept side-effect-free so the booking math can be unit-tested in isolation.
 *
 * Model: a business day is a grid of start-times spaced `slotDuration` minutes
 * apart, from open to close. A service that lasts `serviceDuration` minutes
 * occupies ceil(serviceDuration / slotDuration) consecutive grid slots for
 * capacity-locking purposes — but whether a given start is offered at all is
 * decided by ONE real-clock check (`coveredTimes` + `resolveDayBounds`):
 * does the service actually finish by closing time, in real minutes? Not by
 * how many whole grid-cells happen to exist after it. This is what lets a
 * business stay bookable right up to closing regardless of how slotDuration
 * and a service's own duration relate to each other.
 */

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Deterministic Firestore doc id for a slot. e.g. ("2026-07-10","14:30") -> "2026-07-10_14-30" */
export function slotId(dateStr, time) {
  return `${dateStr}_${time.replace(':', '-')}`;
}

/** "HH:MM" -> minutes since midnight. */
export function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** minutes since midnight -> "HH:MM" (wraps past 24h for overnight businesses). */
export function toTime(mins) {
  const m = ((mins % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * A day's { openMinutes, closeMinutes } as absolute, wrap-aware minutes
 * (closeMinutes > 1440 for an overnight business, e.g. close="02:00" after
 * open="20:00" resolves to 26:00). The one place that decides "is this day
 * open, and until when" — grid generation, availability, and the booking
 * transaction all resolve bounds through this, so they can never disagree.
 */
export function resolveDayBounds(openTime, closeTime) {
  const openMinutes = toMinutes(openTime);
  let closeMinutes = toMinutes(closeTime);
  if (closeMinutes <= openMinutes) closeMinutes += 24 * 60; // overnight
  return { openMinutes, closeMinutes };
}

/**
 * Build the ordered grid of candidate start-times for a day, spaced
 * `slotDuration` apart from open up to (not including) close. This can
 * include a trailing label that's less than `slotDuration` from closing —
 * it still exists as an addressable capacity-tracking key (and a valid
 * start for anything short enough to fit), it's just never on its own
 * guaranteed to hold a full slotDuration. Whether any given service
 * actually fits at a given start is decided later, by real minutes
 * (see `coveredTimes`) — not by how this grid happens to be spaced.
 */
export function generateTimeSlots(openTime, closeTime, slotDuration) {
  const slots = [];
  const { openMinutes, closeMinutes } = resolveDayBounds(openTime, closeTime);
  for (let cur = openMinutes; cur < closeMinutes; cur += slotDuration) {
    slots.push(toTime(cur));
  }
  return slots;
}

/** How many consecutive grid slots a service occupies. */
export function slotsNeeded(serviceDuration, slotDuration) {
  const d = serviceDuration && serviceDuration > 0 ? serviceDuration : slotDuration;
  return Math.max(1, Math.ceil(d / slotDuration));
}

/**
 * The consecutive start-times a service booked at `startTime` would occupy.
 * Returns null if the service would run past closing (doesn't fit).
 *
 * `dayBounds` (from `resolveDayBounds`), when given, is the real decider:
 * the service must actually finish by close in real minutes. Without it,
 * this falls back to the older, coarser check (enough whole grid-cells
 * exist) — kept only so a caller that hasn't been updated yet still works,
 * not because both checks are equally correct.
 */
export function coveredTimes(startTime, serviceDuration, slotDuration, grid, dayBounds = null) {
  const need = slotsNeeded(serviceDuration, slotDuration);
  const idx = grid.indexOf(startTime);
  if (idx === -1) return null;
  if (idx + need > grid.length) return null; // not enough grid cells left to lock

  if (dayBounds) {
    let startMin = toMinutes(startTime);
    if (startMin < dayBounds.openMinutes) startMin += 24 * 60; // overnight wrap
    const duration = serviceDuration && serviceDuration > 0 ? serviceDuration : slotDuration;
    if (startMin + duration > dayBounds.closeMinutes) return null; // really doesn't fit before close
  }

  return grid.slice(idx, idx + need);
}

/**
 * Compute bookable start-times for a day.
 *
 * @param grid        ordered start-times from generateTimeSlots
 * @param bookedMap   { "HH:MM": bookedCount } for slots that already have bookings
 * @param capacity    max concurrent bookings per slot (>=1)
 * @param serviceDuration  minutes; null => single slot
 * @param slotDuration     grid spacing in minutes
 * @param nowCtx      { isToday, nowMinutes, openMinutes } for filtering past slots (optional)
 * @param dayBounds   { openMinutes, closeMinutes } from resolveDayBounds — real fit check (optional)
 * @returns string[] bookable start-times
 */
export function computeAvailable(grid, bookedMap, capacity, serviceDuration, slotDuration, nowCtx = null, dayBounds = null) {
  const cap = capacity && capacity > 0 ? capacity : 1;
  return grid.filter((start) => {
    const covered = coveredTimes(start, serviceDuration, slotDuration, grid, dayBounds);
    if (!covered) return false; // doesn't fit before close
    // every slot the service spans must have room
    for (const t of covered) {
      if ((bookedMap[t] || 0) >= cap) return false;
    }
    // for today, drop start-times that are already in the past (+30min lead)
    if (nowCtx?.isToday) {
      let startMin = toMinutes(start);
      if (startMin < nowCtx.openMinutes) startMin += 24 * 60; // overnight slot
      if (startMin <= nowCtx.nowMinutes + 30) return false;
    }
    return true;
  });
}
