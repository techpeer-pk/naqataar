import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { t } from '../../i18n';
import { hasSeenTour, markTourSeen, setTourActive } from '../../utils/tour';
import './AppTour.css';

/**
 * First-visit guided tour of the home page ("/").
 * Runs once per browser (see utils/tour.js); "/?tour=1" replays it
 * (Footer → App Tour). Each step highlights the first VISIBLE element from
 * its selector list — mobile shows BottomNav, desktop the Navbar — and a
 * step whose target isn't on screen is left out. Steps without a target
 * are centred cards (welcome / finish).
 */
const STEPS = [
  {
    title: 'Welcome to Naqatar!',
    text: 'Book a clinic appointment in a minute. Take a quick 30-second tour?',
    primary: 'Start tour',
  },
  {
    target: ['#find-biz-number'],
    title: 'Find a clinic by its number',
    text: "Type the clinic's phone number in any format: 0300…, 92300… or +92 300…",
  },
  {
    target: ['.fb-submit'],
    title: "Open the clinic's page",
    text: "Tap here. We'll take you straight to the clinic's page, where you pick a service, a day and a free time.",
  },
  {
    target: ['.bottom-nav a[href="/index/my-appointments"]', '.navbar-links a[href="/index/my-appointments"]'],
    title: 'Your bookings',
    text: 'All your appointments in one place. You can also cancel from here.',
  },
  {
    target: [
      '.bottom-nav a[href="/index/login"]', '.bottom-nav a[href="/index/profile"]',
      '.navbar-auth a[href="/index/login"]', '.navbar-auth .user-menu',
    ],
    title: 'Login & Account',
    text: "Log in with Google or email. It's needed to book, so there are no fake bookings.",
  },
  {
    target: ['.bottom-nav button.bottom-nav-item'],
    title: 'Need help?',
    text: 'Chat with Naqatar Support right here.',
  },
  {
    target: ['.navbar-share'],
    title: 'Share Naqatar',
    text: 'Send the app link to family and friends on WhatsApp.',
  },
  {
    target: ['.nav-help-btn'],
    title: 'Replay this tour',
    text: 'Tap this ? anytime to see this tour again.',
  },
  {
    title: "You're all set!",
    text: "Tip: install Naqatar on your phone's home screen for quick access. Clinic owner? Register your clinic from the bottom of the page.",
    primary: 'Finish',
  },
];

const PAD = 8;          // spotlight padding around the target
const GAP = 14;         // space between spotlight and card
const MARGIN = 16;      // min distance from viewport edges

function findVisible(selectors = []) {
  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') return el;
    }
  }
  return null;
}

export default function AppTour() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [steps, setSteps] = useState(null);   // resolved steps (only targets on screen)
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [cardPos, setCardPos] = useState(null);
  const cardRef = useRef(null);
  const primaryRef = useRef(null);

  const replay = new URLSearchParams(search).get('tour') === '1';

  // Start: on "/" for a first-time visitor, or when ?tour=1 is present.
  useEffect(() => {
    if (pathname !== '/' || steps) return;
    if (!replay && hasSeenTour()) return;
    // Let the page (and BottomNav / Navbar) render before measuring.
    const timer = setTimeout(() => {
      const resolved = STEPS.filter(s => !s.target || findVisible(s.target));
      setIndex(0);
      setSteps(resolved);
      setTourActive(true);
    }, 700);
    return () => clearTimeout(timer);
  }, [pathname, replay, steps]);

  const close = useCallback(() => {
    markTourSeen();
    setSteps(null);
    setRect(null);
    setTourActive(false);
    if (replay) navigate('/', { replace: true });
  }, [replay, navigate]);

  // Leaving "/" mid-tour ends it (counts as seen).
  useEffect(() => { if (steps && pathname !== '/') close(); }, [pathname, steps, close]);
  useEffect(() => () => setTourActive(false), []);

  const step = steps?.[index];

  // Measure the current target; keep it in sync on scroll / resize.
  useEffect(() => {
    if (!step) return;
    if (!step.target) { setRect(null); return; }
    const el = findVisible(step.target);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const measure = () => setRect(el.getBoundingClientRect());
    const timer = setTimeout(measure, 350);
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  // Place the card below the target if it fits, else above; centred if no target.
  useLayoutEffect(() => {
    if (!step || !cardRef.current) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const card = cardRef.current.getBoundingClientRect();
    if (!rect) { setCardPos({ top: Math.max(MARGIN, (vh - card.height) / 2), left: Math.max(MARGIN, (vw - card.width) / 2) }); return; }
    const below = rect.bottom + PAD + GAP;
    const above = rect.top - PAD - GAP - card.height;
    const top = below + card.height <= vh - MARGIN ? below : Math.max(MARGIN, above);
    const left = Math.min(Math.max(MARGIN, rect.left + rect.width / 2 - card.width / 2), vw - card.width - MARGIN);
    setCardPos({ top, left });
  }, [rect, step, index]);

  useEffect(() => { primaryRef.current?.focus({ preventScroll: true }); }, [index, steps]);

  const next = useCallback(() => {
    if (index >= steps.length - 1) close(); else setIndex(i => i + 1);
  }, [index, steps, close]);
  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!steps) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [steps, close, next, back]);

  if (!step) return null;

  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  // Count only the "real" highlight steps for "2 / 6".
  const total = steps.length;

  return createPortal(
    <div className="tour-root" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      {/* Click-catcher: the page underneath is not clickable during the tour. */}
      <div className={`tour-backdrop${rect ? '' : ' tour-backdrop--dim'}`} />
      {rect && (
        <div
          className="tour-spotlight"
          style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      )}
      <div
        ref={cardRef}
        className={`tour-card${rect ? '' : ' tour-card--center'}`}
        style={cardPos ? { top: cardPos.top, left: cardPos.left } : { visibility: 'hidden' }}
      >
        <button type="button" className="tour-close" onClick={close} aria-label={t('Close tour')}>
          <X size={16} />
        </button>
        {!isFirst && !isLast && <p className="tour-count">{index} / {total - 2}</p>}
        {isFirst && <img src="/brand/naqatar-mark.png" alt="" className="tour-mark" width={447} height={512} />}
        <h3 id="tour-title" className="tour-title">{t(step.title)}</h3>
        <p id="tour-text" className="tour-text">{t(step.text)}</p>
        <div className="tour-dots" aria-hidden="true">
          {steps.map((_, i) => <span key={i} className={`tour-dot${i === index ? ' active' : ''}`} />)}
        </div>
        <div className="tour-actions">
          {isFirst
            ? <button type="button" className="btn btn-ghost btn-sm" onClick={close}>{t('Skip')}</button>
            : !isLast && <button type="button" className="btn btn-ghost btn-sm" onClick={back}>{t('Previous')}</button>}
          <button ref={primaryRef} type="button" className="btn btn-primary btn-sm" onClick={next}>
            {t(step.primary || 'Next')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
