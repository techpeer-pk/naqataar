import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import PWAInstallGuideModal from './PWAInstallGuideModal';
import './PWAInstallPrompt.css';
import { t } from '../../i18n';

const DISMISS_KEY = 'pwa-install-dismissed';

export default function PWAInstallPrompt() {
  const { installPrompt, isIOS, isIOSNonSafari, isInstalled, promptInstall } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // sessionStorage, not localStorage — dismissing should only silence the
    // banner for the rest of this browser session, not forever.
    if (isInstalled || showPrompt || sessionStorage.getItem(DISMISS_KEY)) return;

    if (installPrompt) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
    if (isIOS) {
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [installPrompt, isIOS, isInstalled, showPrompt]);

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

  if (!showPrompt || isInstalled) return null;

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
          <button className="pwa-close" onClick={handleDismiss} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      </div>
      {showGuide && <PWAInstallGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}
