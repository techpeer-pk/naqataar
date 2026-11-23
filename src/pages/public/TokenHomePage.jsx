import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, X, AlertCircle, Building2, ChevronRight, Hash, MapPin, ScanLine, UserRound, Ticket, CalendarCheck } from 'lucide-react';
import AdBannerStrip from '../../components/public/AdBannerStrip';
import { useBusinesses } from '../../hooks/useBusinesses';
import { usePageTitle } from '../../hooks/usePageTitle';
import { stripCountryCode } from '../../utils/validation';
import { parseScannedText } from '../../utils/clinicQr';
import QrScanModal from '../../components/public/QrScanModal';
import './FindBusinessPage.css';
import { t } from '../../i18n';

// "/" since 2026-11-23 (DOTS): customer types the clinic's number and lands
// straight on that clinic's token page (/index/businessDOTS/:id) — never the
// booking page. FindBusinessPage (number → booking) is temporarily off; see App.jsx.
const STEPS = [
  { icon: Hash,       title: 'Enter the number',     text: "Type the clinic's phone number in any format." },
  { icon: UserRound,  title: 'Name and mobile',      text: 'Enter your full name and mobile number.' },
  { icon: Ticket,     title: 'Get your token',       text: 'See your token number and when your turn comes.' },
];

const tokenPath = id => `/index/businessDOTS/${id}`;
const bookPath  = id => `/index/business/${id}`;
// Two buttons on one number box (2026-11-23): walk-in token or appointment booking.
const pathFor = (intent, id) => (intent === 'book' ? bookPath(id) : tokenPath(id));

export default function TokenHomePage() {
  const navigate = useNavigate();
  const { fetchByPhone } = useBusinesses();
  const [number, setNumber]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]); // >1 clinic on the same number
  const [scanning, setScanning] = useState(false);
  const [intent, setIntent]     = useState('token'); // 'token' | 'book'
  const inputRef = useRef(null);
  usePageTitle(t('Online Token'));

  const search = async (value, want = intent) => {
    setIntent(want);
    setError('');
    setMatches([]);
    if (!stripCountryCode(value)) {
      setError(t('Enter a valid number, e.g. 03001234567'));
      return;
    }
    setLoading(true);
    try {
      const found = (await fetchByPhone(value)).filter(b => b.type === 'clinic');
      if (found.length === 1) navigate(pathFor(want, found[0].id));
      else if (found.length > 1) setMatches(found);
      else setError(t('No clinic found with this number.'));
    } catch {
      setError(t('Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Enter key / Token button = token; the second button books.
  const handleSubmit = (e) => { e.preventDefault(); search(number, 'token'); };

  const handleScan = useCallback((text) => {
    setScanning(false);
    const r = parseScannedText(text);
    if (r.kind === 'clinic') navigate(tokenPath(r.id));
    else if (r.kind === 'phone') { setNumber(r.value); search(r.value, 'token'); }
    else { setMatches([]); setError(t('This is not a Naqatar clinic QR code.')); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);
  const closeScanner = useCallback(() => setScanning(false), []);

  const clear = () => { setNumber(''); setError(''); setMatches([]); inputRef.current?.focus(); };

  return (
    <div className="find-biz fb">
      <div className="find-biz-inner">
        <AdBannerStrip placement="findbusiness" />

        <section className="fb-hero">
          <h1 className="fb-title">{t('Clinic token or appointment')} <span>{t('from home')}</span></h1>
          <p className="fb-sub">{t("Enter the clinic's phone number, then get a token for today or book an appointment.")}</p>

          <form className="fb-card" onSubmit={handleSubmit} noValidate>
            <label className="fb-label" htmlFor="find-biz-number">{t('Clinic number')}</label>
            <div className={`fb-input-wrap ${error ? 'has-error' : ''}`}>
              <Phone size={18} className="fb-input-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                id="find-biz-number"
                className="fb-input"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder={t('e.g. 0300 1234567')}
                value={number}
                onChange={e => { setNumber(e.target.value); setError(''); }}
                aria-invalid={!!error}
                aria-describedby={error ? 'fb-error' : 'fb-hint'}
                autoFocus
              />
              {number && !loading && (
                <button type="button" className="fb-clear" onClick={clear} aria-label={t('Clear number')}>
                  <X size={16} />
                </button>
              )}
              <button type="button" className="fb-scan" onClick={() => setScanning(true)} disabled={loading}
                aria-label={t('Scan clinic QR')} title={t('Scan clinic QR')}>
                <ScanLine size={20} />
              </button>
            </div>
            {error
              ? <p id="fb-error" className="fb-error" role="alert"><AlertCircle size={15} /> {error}</p>
              : <p id="fb-hint" className="fb-hint">{t('Any format works: 0300…, 92300…, +92 300…')}</p>}

            <button type="submit" className="fb-submit" disabled={loading || !number.trim()}>
              {loading && intent === 'token'
                ? <><span className="fb-spinner" aria-hidden="true" /> {t('Searching…')}</>
                : <><Ticket size={18} /> {t('Get Token')}</>}
            </button>
            <button type="button" className="fb-submit fb-submit-alt" disabled={loading || !number.trim()}
              onClick={() => search(number, 'book')}>
              {loading && intent === 'book'
                ? <><span className="fb-spinner" aria-hidden="true" /> {t('Searching…')}</>
                : <><CalendarCheck size={18} /> {t('Book Appointment')}</>}
            </button>
            <p className="fb-hint fb-hint-center">{t('Token = for today, in line. Appointment = from tomorrow, at a fixed time.')}</p>
          </form>

          {matches.length > 1 && (
            <div className="fb-matches">
              <p className="fb-matches-title">{t('{count} clinics use this number. Pick one:', { count: matches.length })}</p>
              {matches.map(b => (
                <Link key={b.id} to={pathFor(intent, b.id)} className="fb-match">
                  <span className="fb-match-icon"><Building2 size={18} /></span>
                  <span className="fb-match-text">
                    <strong>{b.name}</strong>
                    {b.address && <small><MapPin size={12} /> {b.address}</small>}
                  </span>
                  <ChevronRight size={18} className="fb-match-chevron" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="fb-steps" aria-label={t('How it works')}>
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div className="fb-step" key={title}>
              <span className="fb-step-icon"><Icon size={20} /></span>
              <span className="fb-step-num">{i + 1}</span>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
            </div>
          ))}
        </section>
      </div>
      {scanning && <QrScanModal onResult={handleScan} onClose={closeScanner} />}
    </div>
  );
}
