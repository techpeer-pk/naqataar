/**
 * Naqatar UI text — tiny gettext-style helper.
 *
 *   import { t } from '../../i18n';
 *   t('Sign In')                          → 'Login karein'
 *   t('Hello, {name}', { name: 'Ali' })   → 'Assalam o Alaikum, Ali'
 *
 * The English source text IS the key. If a string has no entry in the
 * dictionary it renders in English, so a missing translation never breaks
 * the UI. Adding an English toggle later = make LANG switchable.
 *
 * Style (Hinglish / Roman Urdu): short, friendly, "aap" form. Keep everyday
 * English words people already use: Booking, Appointment, Clinic, Service,
 * Login, Password, Email, Dashboard.
 */
import hinglish from './hinglish';

const DICTS = { hinglish };
const LANG = 'hinglish';

export function t(text, vars) {
  const out = DICTS[LANG]?.[text] ?? text;
  if (!vars) return out;
  return out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

// Appointment status values stored in Firestore → display label.
const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-Show',
};
export function statusLabel(status) {
  return t(STATUS_LABELS[status] || status || '');
}

export default t;
