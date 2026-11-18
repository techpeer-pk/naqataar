import { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import './PaymentProofLink.css';
import { t } from '../../i18n';

// Inline preview instead of opening a new tab — an admin working through a
// list of pending items shouldn't lose their place switching tabs each time.
export default function PaymentProofLink({ url }) {
  const [open, setOpen] = useState(false);

  if (!url) return <span className="text-muted">—</span>;

  return (
    <>
      <button type="button" className="payment-proof-link" onClick={() => setOpen(true)}>
        {t('View screenshot')}
      </button>
      {open && (
        <div className="proof-lightbox-overlay" onClick={() => setOpen(false)}>
          <div className="proof-lightbox-box" onClick={e => e.stopPropagation()}>
            <div className="proof-lightbox-header">
              <a href={url} target="_blank" rel="noopener noreferrer" className="proof-lightbox-open-new">
                <ExternalLink size={14} /> Open original
              </a>
              <button type="button" className="proof-lightbox-close" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <img src={url} alt="Payment proof screenshot" className="proof-lightbox-img" />
          </div>
        </div>
      )}
    </>
  );
}
