import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, X, AlertCircle, Building2, ChevronRight, Hash, MapPin, ScanLine, UserRound, Ticket, CalendarCheck, Search } from 'lucide-react';
import AdBannerStrip from '../../components/public/AdBannerStrip';
import { useBusinesses } from '../../hooks/useBusinesses';
import { usePageTitle } from '../../hooks/usePageTitle';
import { stripCountryCode } from '../../utils/validation';
import { parseScannedText } from '../../utils/clinicQr';
import QrScanModal from '../../components/public/QrScanModal';
import { visitModeOf } from '../../utils/dots';
import './FindBusinessPage.css';
import { t } from '../../i18n';

// "/" since 2026-11-23 (DOTS): customer types the clinic's number. What
// happens next follows the clinic's own setting (business.visitMode, set on
// /admin/profile): token only → its token page, booking only → its booking
// page, both → a card with two buttons. FindBusinessPage (number → booking)
// is temporarily off; see App.jsx.
const STEPS = [
  { icon: Hash,       title: 'Enter the number',     text: "Type the clinic's phone number in any format." },
  { icon: UserRound,  title: 'Name and mobile',      text: 'Enter your full name and mobile number.' },
  { icon: Ticket,     title: 'Get your token',       text: 'See your token number and when your turn comes.' },
];

const tokenPath = id => `/index/businessDOTS/${id}`;
const bookPath  = id => `/index/business/${id}`;

export default function TokenHomePage() {
  const navigate = useNavigate();
  const { fetchByPhone, fetchOne } = useBusinesses();
  const [number, setNumber]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);   // >1 clinic on the same number
  const [chosen, setChosen]   = useState(null); // clinic offering both → patient picks
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef(null);
  usePageTitle(t('Online Token'));

  const openClinic = (biz) => {
    const mode = visitModeOf(biz);
    if (mode === 'token') navigate(tokenPath(biz.id));
    else if (mode === 'booking') navigate(bookPath(biz.id));
    else { setMatches([]); setChosen(biz); }
  };

  const search = async (value) => {
    setError('');
    setMatches([]);
    setChosen(null);
    if (!stripCountryCode(value)) {
      setError(t('Enter a valid number, e.g. 03001234567'));
      return;
    }
    setLoading(true);
    try {
      const found = (await fetchByPhone(value)).filter(b => b.type === 'clinic');
      if (found.length === 1) openClinic(found[0]);
      else if (found.length > 1) setMatches(found);
      else setError(t('No clinic found with this number.'));
    } catch {
      setError(t('Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); search(number); };

  // A clinic poster QR carries only the clinic id → load it to know its mode.
  const handleScan = useCallback(async (text) => {
    setScanning(false);
    const r = parseScannedText(text);
    if (r.kind === 'clinic') {
      try {
        const biz = await fetchOne(r.id);
        if (biz) openClinic(biz); else setError(t('No clinic found with this number.'));
      } catch { setError(t('Something went wrong. Please try again.')); }
    }
    else if (r.kind === 'phone') { setNumber(r.value); search(r.value); }
    else { setMatches([]); setError(t('This is not a Naqatar clinic QR code.')); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);
  const closeScanner = useCallback(() => setScanning(false), []);

  const clear = () => { setNumber(''); setError(''); setMatches([]); setChosen(null); inputRef.current?.focus(); };

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
                onChange={e => { setNumber(e.target.value); setError(''); setChosen(null); }}
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
              {loading
                ? <><span className="fb-spinner" aria-hidden="true" /> {t('Searching…')}</>
                : <><Search size={18} /> {t('Find clinic')}</>}
            </button>
          </form>

          {/* Clinic offers both → the patient picks */}
          {chosen && (
            <div className="fb-card fb-choice" role="region" aria-label={chosen.name}>
              <div className="fb-choice-head">
                <span className="fb-match-icon"><Building2 size={18} /></span>
                <span className="fb-match-text">
                  <strong>{chosen.name}</strong>
                  {chosen.address && <small><MapPin size={12} /> {chosen.address}</small>}
                </span>
              </div>
              <Link to={tokenPath(chosen.id)} className="fb-submit"><Ticket size={18} /> {t('Get Token')}</Link>
              <Link to={bookPath(chosen.id)} className="fb-submit fb-submit-alt"><CalendarCheck size={18} /> {t('Book Appointment')}</Link>
              <p className="fb-hint fb-hint-center">{t('Token = for today, in line. Appointment = from tomorrow, at a fixed time.')}</p>
            </div>
          )}

          {matches.length > 1 && (
            <div className="fb-matches">
              <p className="fb-matches-title">{t('{count} clinics use this number. Pick one:', { count: matches.length })}</p>
              {matches.map(b => (
                <button type="button" key={b.id} onClick={() => openClinic(b)} className="fb-match">
                  <span className="fb-match-icon"><Building2 size={18} /></span>
                  <span className="fb-match-text">
                    <strong>{b.name}</strong>
                    {b.address && <small><MapPin size={12} /> {b.address}</small>}
                  </span>
                  <ChevronRight size={18} className="fb-match-chevron" />
                </button>
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
