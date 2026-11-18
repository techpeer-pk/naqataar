import { useState, useEffect, useRef } from 'react';
// import { Share2, Link2, Share as ShareOutIcon } from 'lucide-react';
import { Share2, Link2, Share as ShareOutIcon, Facebook, Twitter, Linkedin, Send, Mail, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import './ShareMenu.css';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366">
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.27 4.9L2 22l5.25-1.27A9.95 9.95 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10zm0 18.13c-1.6 0-3.13-.44-4.46-1.24l-.32-.19-3.13.76.77-3.05-.2-.32a8.13 8.13 0 1 1 7.34 4.04zm4.5-6.1c-.25-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.25-.63.79-.78.95-.14.16-.29.18-.53.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.24-.41.08-.16.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.16 1.73 2.64 4.2 3.7.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.44-.59 1.65-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28z"/>
    </svg>
  );
}

// 2026-11-17: more share targets (works on PC + mobile without the native
// sheet). Each builds a plain URL; desktop opens a small popup, mobile a tab
// (which hands off to the installed app where there is one).
const isMobile = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

function openShareWindow(href) {
  if (isMobile()) { window.open(href, '_blank', 'noopener,noreferrer'); return; }
  const w = 600, h = 560;
  const left = Math.max(0, (window.screen.width - w) / 2);
  const top = Math.max(0, (window.screen.height - h) / 2);
  const win = window.open(href, 'qufree-share', `width=${w},height=${h},left=${left},top=${top},noopener,noreferrer`);
  if (!win) window.open(href, '_blank', 'noopener,noreferrer'); // popup blocked → plain tab
}

// navigator.clipboard needs a secure context + permission; fall back to the
// old execCommand trick for older/in-app browsers.
async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function ShareMenu({ url, title, text, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    // 2026-11-17: also close on Esc
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    // return () => document.removeEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // const copyLink = async () => {
  //   try {
  //     await navigator.clipboard.writeText(shareUrl);
  //     toast.success('Link copied');
  //   } catch {
  //     toast.error('Could not copy link');
  //   }
  //   setOpen(false);
  // };
  const copyLink = async () => {
    if (await copyText(shareUrl)) toast.success('Link copied');
    else toast.error('Could not copy link');
    setOpen(false);
  };

  const message = text ? `${text} ${shareUrl}` : shareUrl;
  const enc = encodeURIComponent;
  const targets = [
    { key: 'facebook', label: 'Facebook', icon: <Facebook size={16} color="#1877F2" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}` },
    { key: 'x', label: 'X (Twitter)', icon: <Twitter size={16} color="#111111" />,
      href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(text || title || '')}` },
    { key: 'linkedin', label: 'LinkedIn', icon: <Linkedin size={16} color="#0A66C2" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}` },
    { key: 'telegram', label: 'Telegram', icon: <Send size={16} color="#229ED9" />,
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(text || title || '')}` },
  ];
  const shareTo = (href) => { openShareWindow(href); setOpen(false); };
  const shareByEmail = () => {
    window.location.href = `mailto:?subject=${enc(title || 'Check this out')}&body=${enc(message)}`;
    setOpen(false);
  };
  const shareBySms = () => {
    // "sms:?&body=" is understood by both iOS and Android
    window.location.href = `sms:?&body=${enc(message)}`;
    setOpen(false);
  };

  const shareOnWhatsApp = () => {
    const message = text ? `${text} ${shareUrl}` : shareUrl;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const shareMore = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // user cancelled the native sheet — nothing to do
      }
    } else {
      await copyLink();
    }
    setOpen(false);
  };

  return (
    <div className={`share-menu ${className}`} ref={ref}>
      <button
        type="button"
        className="share-menu-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Share"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Share"
      >
        <Share2 size={18} />
      </button>

      {open && (
        <div className="share-menu-dropdown" role="menu">
          {/* 2026-11-17: native sheet first on devices that have one (mobile) */}
          {canNativeShare && (
            <button type="button" role="menuitem" className="share-menu-item share-menu-item--primary" onClick={shareMore}>
              <span className="share-menu-icon"><ShareOutIcon size={16} /></span>
              Share via…
            </button>
          )}
          <button type="button" role="menuitem" className="share-menu-item" onClick={copyLink}>
            <span className="share-menu-icon"><Link2 size={16} /></span>
            Copy Link
          </button>
          <button type="button" role="menuitem" className="share-menu-item" onClick={shareOnWhatsApp}>
            <span className="share-menu-icon"><WhatsAppIcon /></span>
            WhatsApp
          </button>
          {targets.map(t => (
            <button key={t.key} type="button" role="menuitem" className="share-menu-item" onClick={() => shareTo(t.href)}>
              <span className="share-menu-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
          <button type="button" role="menuitem" className="share-menu-item" onClick={shareByEmail}>
            <span className="share-menu-icon"><Mail size={16} /></span>
            Email
          </button>
          {isMobile() && (
            <button type="button" role="menuitem" className="share-menu-item" onClick={shareBySms}>
              <span className="share-menu-icon"><MessageSquare size={16} /></span>
              SMS
            </button>
          )}
          {/* {canNativeShare && (
            <button type="button" className="share-menu-item" onClick={shareMore}>
              <span className="share-menu-icon"><ShareOutIcon size={16} /></span>
              More options
            </button>
          )} */}
        </div>
      )}
    </div>
  );
}
