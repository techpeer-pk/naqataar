// Clinic QR codes — 2026-11-20.
// A clinic's QR is just a link to its public page, so it also works when
// scanned with the phone's normal camera app (opens the browser), not only
// with the in-app scanner on the home page.

const PUBLIC_ORIGIN = 'https://naqatar.web.app';

// In dev the QR points at the local server so scanning can be tested.
const qrOrigin = () => (import.meta.env.DEV ? window.location.origin : PUBLIC_ORIGIN);

export const clinicQrUrl = (businessId) =>
  `${qrOrigin()}/index/business/${encodeURIComponent(businessId)}?src=qr`;

// 2026-11-23: a token poster's QR opens the clinic's token page directly.
export const tokenQrUrl = (businessId) =>
  `${qrOrigin()}/index/businessDOTS/${encodeURIComponent(businessId)}?src=qr`;

const CLINIC_PATH = /^\/index\/(?:business|booking)\/([^/?#]+)\/?$/;
const TOKEN_PATH  = /^\/index\/businessDOTS\/([^/?#]+)\/?$/;

/**
 * Reads whatever the scanner returned.
 *  { kind: 'clinic', id }   — a Naqatar clinic link
 *  { kind: 'token', id }    — a Naqatar clinic's token-page link (token poster)
 *  { kind: 'phone', value } — plain text that looks like a phone number
 *  { kind: 'unknown' }      — anything else (another site's QR, Wi-Fi, …)
 */
export function parseScannedText(text) {
  const raw = String(text || '').trim();
  try {
    const url = new URL(raw);
    const okHost = [new URL(PUBLIC_ORIGIN).host, window.location.host].includes(url.host);
    const m = url.pathname.match(CLINIC_PATH);
    if (okHost && m) return { kind: 'clinic', id: decodeURIComponent(m[1]) };
    const tk = url.pathname.match(TOKEN_PATH);
    if (okHost && tk) return { kind: 'token', id: decodeURIComponent(tk[1]) };
    return { kind: 'unknown' };
  } catch {
    // not a URL
  }
  const digits = raw.replace(/^tel:/i, '').replace(/[\s\-()]/g, '');
  if (/^\+?\d{10,13}$/.test(digits)) return { kind: 'phone', value: digits };
  return { kind: 'unknown' };
}
