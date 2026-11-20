import { useState } from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { isInAppBrowser, isAndroid, chromeIntentUrl } from '../../utils/inAppBrowser';
import './InAppBrowserNotice.css';
import { t } from '../../i18n';

// Shown above "Continue with Google" when the page is running inside an
// in-app browser (WhatsApp, Facebook, Google Lens, a QR-scanner app…), where
// Google blocks sign-in. Renders nothing in a normal browser.
export default function InAppBrowserNotice() {
  const [copied, setCopied] = useState(false);
  if (!isInAppBrowser()) return null;

  const copyLink = async () => {
    const href = window.location.href;
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = href;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="iab-notice" role="note">
      <p className="iab-title">{t('Google sign-in does not work inside this app')}</p>
      <p className="iab-text">
        {t('Open this page in Chrome or Safari to continue with Google, or sign in with email below.')}
      </p>
      <div className="iab-actions">
        {isAndroid() && (
          <a className="btn btn-primary btn-sm" href={chromeIntentUrl()}>
            <ExternalLink size={15} /> {t('Open in Chrome')}
          </a>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
          {copied ? <><Check size={15} /> {t('Link copied')}</> : <><Copy size={15} /> {t('Copy link')}</>}
        </button>
      </div>
    </div>
  );
}
