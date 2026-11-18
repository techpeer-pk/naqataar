import { useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import PWAInstallGuideModal from './PWAInstallGuideModal';
import './InstallAppButton.css';
import { t } from '../../i18n';

export default function InstallAppButton({ className = '' }) {
  const { installPrompt, isIOS, isIOSNonSafari, isInstalled, promptInstall } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  const handleClick = async () => {
    if (installPrompt) {
      await promptInstall();
      return;
    }
    if (isIOSNonSafari) {
      toast('Open this site in Safari to install it');
      return;
    }
    if (isIOS) {
      setShowGuide(true);
      return;
    }
    toast('Install isn\'t available on this browser yet.');
  };

  if (isInstalled) return null;

  return (
    <>
      <button type="button" className={`install-app-btn ${className}`} onClick={handleClick}>
        <Download size={14} /> {t('Install App')}
      </button>
      {showGuide && <PWAInstallGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
}
