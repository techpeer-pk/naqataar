import { lazy, Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import '../superadmin/Modal.css';
import './LegalModal.css';
import { t } from '../../i18n';

// Lazy so the register pages don't pay for the full legal text up front —
// same chunks App.jsx already splits out for the /terms and /privacy routes.
const TermsPage   = lazy(() => import('../../pages/public/TermsPage'));
const PrivacyPage = lazy(() => import('../../pages/public/PrivacyPage'));

const TITLES = { terms: 'Terms of Service', privacy: 'Privacy Policy' };

/**
 * Terms / Privacy shown in-place over the signup form, instead of the old
 * target="_blank" link — a new tab cold-boots the whole app (looks like a
 * full reload, worse inside the Android TWA), and a same-tab navigation
 * would wipe the half-filled form. `doc` is 'terms' | 'privacy' | null;
 * onOpenDoc lets the cross-link inside one doc switch to the other.
 *
 * Own backdrop (not superadmin/Modal) because that one sits at z-index 400,
 * under BottomNav's 500 — the tab bar would cover the popup on mobile.
 * Portaled to <body>: the signup .auth-card keeps a transform from its
 * fade-up animation (fill-mode both), which would otherwise turn the
 * position:fixed backdrop into one confined to the card.
 */
export default function LegalModal({ doc, onOpenDoc, onClose }) {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  if (!doc) return null;

  const Page = doc === 'privacy' ? PrivacyPage : TermsPage;

  return createPortal(
    <div className="sa-modal-backdrop legal-modal-backdrop" onClick={onClose}>
      <div className="sa-modal card fade-up legal-modal" onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3>{t(TITLES[doc])}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="card-body">
          <Suspense fallback={<div className="legal-modal-loading"><Loader2 size={20} className="icon-spin" /></div>}>
            <Page embedded onOpenDoc={onOpenDoc} />
          </Suspense>
        </div>
      </div>
    </div>,
    document.body
  );
}
