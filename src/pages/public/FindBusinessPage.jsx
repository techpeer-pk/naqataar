import { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, Search, X, AlertCircle, Building2, ChevronRight, CalendarCheck, Hash, MapPin, ScanLine } from 'lucide-react';
import AdBannerStrip from '../../components/public/AdBannerStrip';
import AdCarousel from '../../components/public/AdCarousel';
import { useBusinesses } from '../../hooks/useBusinesses';
import { usePageTitle } from '../../hooks/usePageTitle';
import { stripCountryCode } from '../../utils/validation';
import { parseScannedText } from '../../utils/clinicQr';
import QrScanModal from '../../components/public/QrScanModal';
import { getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { queueRef, todayPKT } from '../../utils/dots';
import './FindBusinessPage.css';
import { t } from '../../i18n';

// 2026-11-17 upgrade: hero + search card + "how it works", Qufree teal.
const STEPS = [
  { icon: Hash,          title: 'Enter the number', text: "Type the clinic's phone number in any format." },
  { icon: Search,        title: 'We find it',       text: 'Naqatar matches it to the registered clinic.' },
  { icon: CalendarCheck, title: 'Book instantly',   text: 'Open its page, pick a service and a time.' },
];

// /find-business — customer types a business's phone number ("business
// number"), lands straight on that business's page (/index/business/:id).
// Ad slot on top is the 'findbusiness' placement in SuperAdmin → Ad Management.
export default function FindBusinessPage() {
  const navigate = useNavigate();
  const { fetchByPhone } = useBusinesses();
  const [number, setNumber]   = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]); // >1 business on the same number
  const inputRef = useRef(null);
  usePageTitle(t('Find a clinic'));

  const [scanning, setScanning] = useState(false);

  // DOTS (2026-11-23): a clinic running today's token queue opens straight on
  // its token page; every other clinic keeps opening its booking page.
  const openClinic = async (id) => {
    let dots = false;
    try {
      const q = await getDoc(queueRef(db, id, todayPKT()));
      dots = q.exists() && q.data().isOpen === true;
    } catch { /* no queue info → normal clinic page */ }
    navigate(dots ? `/index/businessDOTS/${id}` : `/index/business/${id}`);
  };

  const search = async (value) => {
    setError('');
    setMatches([]);
    if (!stripCountryCode(value)) {
      setError(t('Enter a valid number, e.g. 03001234567'));
      return;
    }
    setLoading(true);
    try {
      // Naqatar: clinics only. fetchByPhone searches every active business
      // on the shared QuFree backend (salons, restaurants, hotels…), whose
      // booking pages don't exist in this app.
      const found = (await fetchByPhone(value)).filter(b => b.type === 'clinic');
      if (found.length === 1) await openClinic(found[0].id);
      else if (found.length > 1) setMatches(found);
      else setError(t('No clinic found with this number.'));
    } catch {
      setError(t('Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    search(number);
  };

  // QR scan (2026-11-20): a clinic poster QR opens that clinic's page; a QR
  // holding just a phone number fills the box and searches it.
  const handleScan = useCallback((text) => {
    setScanning(false);
    const r = parseScannedText(text);
    if (r.kind === 'clinic') navigate(`/index/business/${r.id}`);
    else if (r.kind === 'phone') { setNumber(r.value); search(r.value); }
    else { setMatches([]); setError(t('This is not a Naqatar clinic QR code.')); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);
  const closeScanner = useCallback(() => setScanning(false), []);

  // ── Previous (v1) markup, kept for reference — replaced 2026-11-17 ──
  // return (
  //   <div className="find-biz">
  //     <div className="find-biz-inner">
  //       <AdBannerStrip placement="findbusiness" />
  //
  //       <form className="find-biz-form" onSubmit={handleSubmit} noValidate>
  //         <label className="form-label" htmlFor="find-biz-number">Business number</label>
  //         <input
  //           id="find-biz-number"
  //           className="form-control"
  //           type="tel"
  //           inputMode="tel"
  //           placeholder="Enter here"
  //           value={number}
  //           onChange={e => { setNumber(e.target.value); setError(''); }}
  //           autoFocus
  //         />
  //         {error && <p className="find-biz-error">{error}</p>}
  //         <button type="submit" className="btn btn-primary find-biz-submit" disabled={loading || !number.trim()}>
  //           {loading ? 'Searching…' : 'Submit'}
  //         </button>
  //       </form>
  //
  //       {matches.length > 1 && (
  //         <div className="find-biz-matches">
  //           <p>Multiple businesses use this number — pick one:</p>
  //           {matches.map(b => (
  //             <Link key={b.id} to={`/index/business/${b.id}`} className="find-biz-match">
  //               {b.name}{b.address ? <span> — {b.address}</span> : null}
  //             </Link>
  //           ))}
  //         </div>
  //       )}
  //
  //       {/* Rotating ads — SuperAdmin → Ad Management → Ad Carousel */}
  //       <div className="find-biz-carousel">
  //         <AdCarousel placement="findbusinessCarousel" />
  //       </div>
  //     </div>
  //   </div>
  // );

  const clear = () => { setNumber(''); setError(''); setMatches([]); inputRef.current?.focus(); };

  return (
    <div className="find-biz fb">
      <div className="find-biz-inner">
        <AdBannerStrip placement="findbusiness" />

        <section className="fb-hero">
          <h1 className="fb-title">{t('Find any clinic')} <span>{t('by its number')}</span></h1>
          <p className="fb-sub">{t("Enter the clinic's phone number. We'll take you straight to its page to book.")}</p>

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
              <button
                type="button"
                className="fb-scan"
                onClick={() => setScanning(true)}
                disabled={loading}
                aria-label={t('Scan clinic QR')}
                title={t('Scan clinic QR')}
              >
                <ScanLine size={20} />
              </button>
            </div>
            {error
              ? <p id="fb-error" className="fb-error" role="alert"><AlertCircle size={15} /> {error}</p>
              /* : <p id="fb-hint" className="fb-hint">Any format works: 0300 1234567, 92300…, +92 300…</p>} */
              : <p id="fb-hint" className="fb-hint">{t('Any format works: 0300…, 92300…, +92 300…')}</p>}

            <button type="submit" className="fb-submit" disabled={loading || !number.trim()}>
              {loading
                ? <><span className="fb-spinner" aria-hidden="true" /> {t('Searching…')}</>
                : <><Search size={18} /> {t('Find clinic')}</>}
            </button>
          </form>

          {matches.length > 1 && (
            <div className="fb-matches">
              <p className="fb-matches-title">{t('{count} clinics use this number. Pick one:', { count: matches.length })}</p>
              {matches.map(b => (
                <Link key={b.id} to={`/index/business/${b.id}`} className="fb-match">
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

        {/* Rotating ads — SuperAdmin → Ad Management → Ad Carousel */}
        <div className="find-biz-carousel">
          <AdCarousel placement="findbusinessCarousel" />
        </div>
      </div>
      {scanning && <QrScanModal onResult={handleScan} onClose={closeScanner} />}
    </div>
  );
}
