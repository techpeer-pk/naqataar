import { format } from 'date-fns';

/**
 * Human-friendly booking reference derived from the appointment doc id.
 * Deterministic (same id -> same ref), so it works for existing appointments
 * too, and needs no separate uniqueness check.
 * e.g. "OjvexJbF6Vbl995bWLtR" -> "QF-5BWLTR"
 */
export function bookingRef(id) {
  return id ? `QF-${String(id).slice(-6).toUpperCase()}` : '';
}

/**
 * Same scheme for Qunjee Eats food orders, distinct prefix so a customer
 * quoting a ref over the phone is never confused with a booking.
 * e.g. "OjvexJbF6Vbl995bWLtR" -> "QE-5BWLTR"
 */
export function orderRef(id) {
  return id ? `QE-${String(id).slice(-6).toUpperCase()}` : '';
}

/**
 * Short, spoken-aloud account reference — Support asks a caller for this
 * instead of their full 28-char Firebase uid, as a lightweight check that
 * they actually hold the account (not a secret, just too obscure to guess).
 * Same deterministic scheme as booking/order refs.
 * e.g. "Wsaux2leAJdMB6k9cZNiR8XLdQC3" -> "QU-XLDQC3"
 */
export function accountRef(id) {
  return id ? `QU-${String(id).slice(-6).toUpperCase()}` : '';
}

/**
 * Same deterministic scheme, for subscription invoices (see
 * docs/Billing-Subscription.md). e.g. "OjvexJbF6Vbl995bWLtR" -> "INV-5BWLTR"
 */
export function invoiceRef(id) {
  return id ? `INV-${String(id).slice(-6).toUpperCase()}` : '';
}

/**
 * Same deterministic scheme, for hotel room reservations — distinct prefix
 * so a guest quoting a ref is never confused with a QunjeeEats order or a
 * slot-based appointment. e.g. "OjvexJbF6Vbl995bWLtR" -> "QH-5BWLTR"
 */
export function reservationRef(id) {
  return id ? `QH-${String(id).slice(-6).toUpperCase()}` : '';
}

/** "HH:MM" (24h) -> "h:MM AM/PM" for display. Storage/sorting stays 24h. */
export function formatTime12h(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Firestore Timestamp (or {seconds}) -> "d MMMM yyyy" (e.g. "24 July 2026"),
 * matching the date format already used across the business/admin side
 * (BusinessDetailPage's Subscription tab, working-hours displays, etc.).
 */
export function formatDate(ts) {
  if (!ts) return null;
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : null;
  return ms ? format(new Date(ms), 'd MMMM yyyy') : null;
}

/** Firestore timestamp -> "14 Sep 2026, 5:42 PM", for audit-trail displays. */
export function formatDateTime(ts) {
  if (!ts) return null;
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : null;
  return ms ? format(new Date(ms), 'd MMM yyyy, h:mm a') : null;
}

/** ms -> "1h 5m" / "12m" / "<1m", for live or logged session lengths. */
export function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return '<1m';
}

/** "HH:MM" (24h) -> which part of the day a slot falls in, for the hover icon. */
export function dayPart(time) {
  if (!time) return 'noon';
  const [h] = time.split(':').map(Number);
  if (h >= 17 && h < 20) return 'evening';
  if (h >= 20 || h < 5) return 'night';
  return 'noon';
}
