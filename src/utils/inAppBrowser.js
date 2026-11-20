// In-app browsers (2026-11-20): links opened inside WhatsApp, Facebook,
// Instagram, the Google app / Lens, TikTok, or a QR-scanner app run in an
// embedded WebView. Google refuses OAuth there ("disallowed_useragent"), so
// Google sign-in cannot work and the user must open the page in a real browser.
const IN_APP_UA = /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|Bytedance|GSA\/|Twitter|; wv\)/i;

export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  return IN_APP_UA.test(navigator.userAgent || '');
}

export const isAndroid = () =>
  typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');

// Android only: asks the system to open this URL in Chrome.
export function chromeIntentUrl(href = window.location.href) {
  const url = new URL(href);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}
