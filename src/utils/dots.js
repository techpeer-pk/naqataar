// DOTS — Digital Online Token System (2026-11-23).
//
// Firestore layout (rules: K:\QuFree\app_OLD\firestore.rules, "DOTS" block):
//   businesses/{b}/dotsQueues/{yyyy-MM-dd}          { date, maxTokens, lastToken, nowServing, isOpen, createdAt, updatedAt }
//   businesses/{b}/dotsQueues/{date}/mobiles/{03…}  { createdAt }   ← one mobile = one WAITING token (owner frees it on Served/Skip)
//   businesses/{b}/dotsTokens/{16-char id}          { date, seq, name, mobile, status, createdAt[, updatedAt] }
//
// Pure functions that take `db` as an argument, so scripts/smoke-test.mjs
// runs the exact same transaction as the app.
import { doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';

export const MAX_TOKEN_OPTIONS = [50, 100, 200];

// What a clinic offers its patients (business.visitMode, set on /admin/profile):
// 'token' (walk-in queue), 'booking' (appointments) or 'both'. Missing or
// unknown = 'both', so every clinic made before this setting keeps booking.
export const VISIT_MODES = ['both', 'token', 'booking'];
export const visitModeOf = biz => (VISIT_MODES.includes(biz?.visitMode) ? biz.visitMode : 'both');
export const allowsToken   = biz => visitModeOf(biz) !== 'booking';
export const allowsBooking = biz => visitModeOf(biz) !== 'token';
export const MAX_TOKENS_LIMIT = 1000; // mirrors isValidMaxTokens() in rules

// Auto-delete after 90 days (2026-11-23). A Firestore TTL policy on expireAt
// (app_OLD firestore.indexes.json) removes queues, locks and tokens, with the
// patient's name + mobile. Rules accept 85–95 days ahead (isValidExpireAt).
export const KEEP_DAYS = 90;
export const expireAt = (now = Date.now()) => Timestamp.fromMillis(now + KEEP_DAYS * 864e5);

// No 0/O/1/I so the short code is easy to read out at the counter.
// 32 symbols ^ 16 = 80 bits: nobody can guess someone else's token link.
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TOKEN_ID_RE = /^[A-HJ-NP-Z2-9]{16}$/;

export function genTokenId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => ID_ALPHABET[b & 31]).join('');
}

/** Last 6 characters, shown to the customer and checked by the clinic. */
export const shortCode = id => String(id || '').slice(-6);

/** Today in Pakistan time (UTC+5, no DST) as 'yyyy-MM-dd'. Mirrors isTodayPKT() in rules. */
export function todayPKT(now = Date.now()) {
  return new Date(now + 5 * 3600e3).toISOString().slice(0, 10);
}

/** '0300-1234567', '+92 300 1234567', '923001234567' → '03001234567'; anything else → null. */
export function normalizeMobile(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('92')) d = '0' + d.slice(2);
  else if (d.startsWith('3') && d.length === 10) d = '0' + d;
  return /^03\d{9}$/.test(d) ? d : null;
}

export const queueRef = (db, businessId, date) => doc(db, 'businesses', businessId, 'dotsQueues', date);
export const tokenRef = (db, businessId, tokenId) => doc(db, 'businesses', businessId, 'dotsTokens', tokenId);
export const mobileLockRef = (db, businessId, date, mobile) =>
  doc(db, 'businesses', businessId, 'dotsQueues', date, 'mobiles', mobile);

export class DotsError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

/**
 * Takes the next token in today's queue. Throws DotsError with code
 * 'closed' | 'full' | 'duplicate' | 'invalid-name' | 'invalid-mobile'.
 * Returns { tokenId, seq, date }.
 */
export async function issueToken(db, businessId, { name, mobile }) {
  const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
  if (cleanName.length < 2 || cleanName.length > 60) throw new DotsError('invalid-name');
  const cleanMobile = normalizeMobile(mobile);
  if (!cleanMobile) throw new DotsError('invalid-mobile');

  const date = todayPKT();
  const qRef = queueRef(db, businessId, date);
  const lockRef = mobileLockRef(db, businessId, date, cleanMobile);
  const tokenId = genTokenId();

  const seq = await runTransaction(db, async (tx) => {
    const q = await tx.get(qRef);
    if (!q.exists() || !q.data().isOpen) throw new DotsError('closed');
    const { lastToken, maxTokens } = q.data();
    if (lastToken >= maxTokens) throw new DotsError('full');
    const lock = await tx.get(lockRef);
    if (lock.exists()) throw new DotsError('duplicate');

    const next = lastToken + 1;
    tx.update(qRef, { lastToken: next, updatedAt: serverTimestamp() });
    const exp = expireAt();
    tx.set(tokenRef(db, businessId, tokenId), {
      date, seq: next, name: cleanName, mobile: cleanMobile, status: 'waiting', createdAt: serverTimestamp(), expireAt: exp,
    });
    tx.set(lockRef, { createdAt: serverTimestamp(), expireAt: exp });
    return next;
  });

  return { tokenId, seq, date };
}

/** localStorage key remembering this device's token for a clinic + day. */
export const savedTokenKey = (businessId, date) => `dots:${businessId}:${date}`;
