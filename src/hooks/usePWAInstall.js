import { useState, useEffect } from 'react';

// "Add to Home Screen" only exists in Safari's share sheet — Chrome/Firefox/Edge
// on iOS all render via WebKit too (Apple's rule) so the UA still says "iPhone",
// but they can't add to the home screen the same way.
function detectIOSBrowser(userAgent) {
  const ua = userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isIOSNonSafari = isIOS && /crios|fxios|edgios|opios/.test(ua);
  return { isIOS, isIOSNonSafari };
}

// beforeinstallprompt fires once per page load, often before a user ever
// navigates to a route that renders an install button (e.g. /index/login).
// Captured once here at module scope and fanned out to every usePWAInstall()
// caller, instead of each component racing its own listener and missing the
// one-shot event if it mounts after the event already fired.
let capturedEvent = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    capturedEvent = e;
    listeners.forEach((fn) => fn(e));
  });
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(capturedEvent);

  useEffect(() => {
    const onCapture = (e) => setInstallPrompt(e);
    listeners.add(onCapture);
    return () => listeners.delete(onCapture);
  }, []);

  const { isIOS, isIOSNonSafari } = detectIOSBrowser(navigator.userAgent);
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches;

  const promptInstall = async () => {
    if (!installPrompt) return null;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    capturedEvent = null;
    setInstallPrompt(null);
    return choice;
  };

  return { installPrompt, isIOS, isIOSNonSafari, isInstalled, promptInstall };
}
