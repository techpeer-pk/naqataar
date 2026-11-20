import { t } from '../i18n';

// Google sign-in errors → a message a patient can act on (2026-11-20).
// Firebase's own text ("Firebase: Error (auth/...)") meant nothing to users
// and told us nothing in their screenshots, so the raw code is appended to
// the fallback message for diagnosis.
// Returns null for errors that need no toast (sign-in moved to a redirect).
export function googleErrorMessage(err) {
  const code = err?.code || '';
  switch (code) {
    case 'auth/redirecting':
      return null;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return t('Google sign-in was closed before it finished. Please try again.');
    case 'auth/popup-blocked':
      return t('The browser blocked the Google sign-in window. Allow pop-ups and try again.');
    case 'auth/network-request-failed':
      return t('No internet connection. Check your connection and try again.');
    case 'auth/operation-not-supported-in-this-environment':
    case 'auth/web-storage-unsupported':
      return t('Google sign-in does not work in this browser. Open this page in Chrome or Safari, or sign in with email.');
    case 'auth/unauthorized-domain':
      return t('Google sign-in is not available on this site right now. Please sign in with email.');
    case 'auth/too-many-requests':
      return t('Too many attempts. Please wait a few minutes and try again.');
    case 'auth/user-disabled':
      return t('This account has been disabled. Please contact support.');
    // Our own errors — already a translated, specific message.
    case 'auth/role-mismatch':
    case 'auth/no-admin-account':
    case 'auth/account-exists-with-different-credential':
      return err.message;
    default:
      return `${t('Google sign-in failed.')}${code ? ` (${code})` : ''}`;
  }
}
