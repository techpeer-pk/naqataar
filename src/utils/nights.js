/**
 * Pure calendar-night helpers for date-range (check-in/check-out) bookings —
 * the hotel-booking counterpart to slots.js. No Firebase, no React, no
 * wall-clock reads, so this stays unit-testable and side-effect-free.
 */

/** "yyyy-MM-dd" -> local-midnight Date. Avoids new Date("yyyy-MM-dd")'s UTC parse. */
export function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** local Date -> "yyyy-MM-dd". */
export function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * The ordered list of calendar nights a stay covers, as "yyyy-MM-dd" strings —
 * check-in included, check-out excluded (hotel convention: check-out morning
 * isn't a night stayed). Returns [] if checkOut doesn't fall after checkIn.
 */
export function nightsBetween(checkInStr, checkOutStr) {
  const start = parseDateStr(checkInStr);
  const end   = parseDateStr(checkOutStr);
  const nights = [];
  for (let d = start; d < end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    nights.push(toDateStr(d));
  }
  return nights;
}
