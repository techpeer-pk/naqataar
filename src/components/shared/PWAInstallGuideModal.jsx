import { X, Share2, PlusSquare, Check } from 'lucide-react';
import './PWAInstallGuideModal.css';

const STEPS = [
  {
    icon: Share2,
    text: <>Tap the <strong>Share</strong> icon (or <strong>•••</strong> menu) in Safari's toolbar</>,
  },
  {
    icon: PlusSquare,
    text: <>Scroll down and tap <strong>"Add to Home Screen"</strong></>,
  },
  {
    icon: Check,
    text: <>Tap <strong>"Add"</strong> in the top right to confirm</>,
  },
];

export default function PWAInstallGuideModal({ onClose }) {
  return (
    <div className="pwa-guide-overlay" onClick={onClose}>
      <div className="pwa-guide-card" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-guide-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        {/* <h3 className="pwa-guide-title">Install Qunjee on iPhone</h3> */}
        <h3 className="pwa-guide-title">Install Naqatar on iPhone</h3>
        <div className="pwa-guide-steps">
          {STEPS.map(({ icon: Icon, text }, i) => (
            <div className="pwa-guide-step" key={i}>
              <div className="pwa-guide-num">{i + 1}</div>
              <div className="pwa-guide-icon"><Icon size={20} /></div>
              <p className="pwa-guide-text">{text}</p>
            </div>
          ))}
        </div>
        <button className="btn btn-primary pwa-guide-done" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}
