// Shared phone-number rules for Pakistan-only numbers: a fixed "92" country
// code (shown as a non-editable UI prefix) plus a fixed-length local number
// the customer actually types. Kept here so every form that adds this same
// input pattern reuses one definition instead of drifting apart — see
// docs/UI-Field-Validation.md.

export const PH_COUNTRY_CODE = '92';
export const PH_LOCAL_PHONE_LEN = 10; // e.g. "3001234567" — no leading 0

/** True only for exactly PH_LOCAL_PHONE_LEN digits, nothing else. */
export function isValidLocalPhoneDigits(value) {
  return new RegExp(`^\\d{${PH_LOCAL_PHONE_LEN}}$`).test((value || '').trim());
}

/** Joins the fixed country code with the locally-typed digits for storage. */
export function toFullPhone(localDigits) {
  return `${PH_COUNTRY_CODE}${(localDigits || '').trim()}`;
}

/**
 * Recovers the local-only digits from a previously-stored phone value, so an
 * existing number (old format, or already "92"-prefixed) can pre-fill the
 * local-only input instead of showing raw garbage.
 */
export function stripCountryCode(fullPhone) {
  const digits = (fullPhone || '').replace(/\D/g, '');
  if (digits.startsWith(PH_COUNTRY_CODE) && digits.length === PH_COUNTRY_CODE.length + PH_LOCAL_PHONE_LEN) {
    return digits.slice(PH_COUNTRY_CODE.length);
  }
  if (digits.length === PH_LOCAL_PHONE_LEN + 1 && digits.startsWith('0')) {
    return digits.slice(1); // old local format: 0XXXXXXXXXX
  }
  return digits.length === PH_LOCAL_PHONE_LEN ? digits : '';
}

// ── 2026-11-17: length caps + name checks (the "Planned" section of
// docs/UI-Field-Validation.md), first used by AdminRegister.jsx. ──

export const NAME_MAX = 60;           // a person's name
export const BUSINESS_NAME_MAX = 80;  // business names (no format regex — "24/7 Mart" is valid)
export const ADDRESS_MAX = 150;
export const EMAIL_MAX = 100;
export const PASSWORD_MAX = 64;

/**
 * A PERSON's name: Unicode letters (so Urdu/Arabic script works), spaces,
 * dot, apostrophe, hyphen — at least 2 letters. Not for business names.
 */
export function isValidName(value) {
  const v = (value || '').trim();
  return v.length >= 2 && v.length <= NAME_MAX && /^[\p{L}\p{M}\s.'-]+$/u.test(v)
    && (v.match(/\p{L}/gu) || []).length >= 2;
}

/** Business name: 2..BUSINESS_NAME_MAX characters after trimming, any characters. */
export function isValidBusinessName(value) {
  const v = (value || '').trim();
  return v.length >= 2 && v.length <= BUSINESS_NAME_MAX;
}
