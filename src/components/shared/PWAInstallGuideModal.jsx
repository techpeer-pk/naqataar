import { X, Share2, PlusSquare, Check } from 'lucide-react';
import './PWAInstallGuideModal.css';
import { t } from '../../i18n';

const STEPS = [
  {
    icon: Share2,
    text: "Tap the Share icon (or ••• menu) in Safari's toolbar",
  },
  {
    icon: PlusSquare,
    text: 'Scroll down and tap "Add to Home Screen"',
  },
  {
    icon: Check,
    text: 'Tap "Add" in the top right to confirm',
  },
];

export default function PWAInstallGuideModal({ onClose }) {
  return (
    <div className="pwa-guide-overlay" onClick={onClose}>
      <div className="pwa-guide-card" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-guide-close" onClick={onClose} aria-label={t('Close')}>
          <X size={18} />
        </button>
        {/* <h3 className="pwa-guide-title">Install Qunjee on iPhone</h3> */}
        <h3 className="pwa-guide-title">{t('Install Naqatar on iPhone')}</h3>
        <div className="pwa-guide-steps">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <div className="pwa-guide-step" key={i}>
              <div className="pwa-guide-num">{i + 1}</div>
              <div className="pwa-guide-icon"><Icon size={20} /></div>
              <p className="pwa-guide-text">{t(text)}</p>
            </div>
          ))}
        </div>
        <button className="btn btn-primary pwa-guide-done" onClick={onClose}>{t('Got it')}</button>
      </div>
    </div>
  );
}
