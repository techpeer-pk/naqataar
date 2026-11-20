import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import PWAInstallGuideModal from './PWAInstallGuideModal';
import './PWAInstallPrompt.css';
import { t } from '../../i18n';
import { useTourActive } from '../../utils/tour';

const DISMISS_KEY = 'pwa-install-dismissed';
const AUTO_CLOSE_MS = 5000;

export default function PWAInstallPrompt() {
  const { installPrompt, isIOS, isIOSNonSafari, isInstalled, promptInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // Hold back while the first-visit tour is open.
  const tourActive = useTourActive();

  useEffect(() => {
    // sessionStorage, not localStorage — dismissing should only silence the
    // banner for the rest of this browser session, not forever.
    if (isInstalled || showPrompt || tourActive || sessionStorage.getItem(DISMISS_KEY)) return;

    if (installPrompt) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
    if (isIOS) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [installPrompt, isIOS, isInstalled, showPrompt, tourActive]);

  // 2026-11-20 (owner): the banner closes itself after 5 seconds, on Chrome
  // and iOS alike. It is silenced for the rest of this browser session only
  // (sessionStorage), so it comes back the next time the app is opened.
  // Paused while the iPhone "How?" guide is open — it lives inside this
  // component and would vanish with it.
  useEffect(() => {
    if (!showPrompt || showGuide) return;
    const timer = setTimeout(handleDismiss, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPrompt, showGuide]);

  const handleInstall = async () => {
    const choice = await promptInstall();
    if (choice?.outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem(DISMISS_KEY, 'true');
  };

  if (!showPrompt || isInstalled || tourActive) return null;

  return (
    <div className="pwa-prompt">
      <div className="pwa-prompt-inner">
        <div className="pwa-icon">
          <Smartphone size={22} />
        </div>
        <div className="pwa-text">
          {/* <p className="pwa-title">Install Qunjee</p> */}
          <p className="pwa-title">{t('Install Naqatar')}</p>
          {isIOSNonSafari ? (
            <p className="pwa-sub">{t('Open this site in Safari to install it')}</p>
          ) : isIOS ? (
            <p className="pwa-sub">
              {t('Tap Share, then "Add to Home Screen"')}
              {' — '}
              <button className="pwa-how-link" onClick={() => setShowGuide(true)}>{t('How?')}</button>
            </p>
          ) : (
            <p className="pwa-sub">{t('Install for faster access & offline use')}</p>
          )}
        </div>
        <div className="pwa-actions">
          {!isIOS && (
            <button className="btn btn-primary btn-sm" onClick={handleInstall}>
              <Download size={14} /> Install
            </button>
          )}
          {/* 2026-11-20: no close / "later" button (owner decision) — people
              dismissed the prompt without reading it. Only the action stays. */}
        </div>
      </div>
      {showGuide && <PWAInstallGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
