import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, Phone, MapPin, Utensils, Scissors, Stethoscope, Hotel, LandPlot, HeartPulse, Gem, Camera, ChefHat, GraduationCap, AlertTriangle, Sparkles, Car, PartyPopper, ParkingCircle, Palmtree } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useUsers } from '../../hooks/useUsers';
import { HEALTHCARE_CATEGORIES } from '../../utils/healthcareCategories';
import { NAYASAA_CATEGORIES } from '../../utils/nayasaaCategories';
import { RASOOMAT_CATEGORIES } from '../../utils/rasoomatCategories';
import EmailTypoHint from '../../components/shared/EmailTypoHint';
import LegalModal from '../../components/shared/LegalModal';
// 2026-11-17: field validation (docs/UI-Field-Validation.md)
import {
  isValidLocalPhoneDigits, toFullPhone, PH_LOCAL_PHONE_LEN,
  isValidName, isValidBusinessName,
  NAME_MAX, BUSINESS_NAME_MAX, ADDRESS_MAX, EMAIL_MAX, PASSWORD_MAX,
} from '../../utils/validation';

const ROOMS_MAX = 1000;
const PRICE_MAX = 10000000; // PKR

/** Step-2 checks, in screen order — returns the first problem or ''. */
function businessStepError(biz) {
  if (!biz.type) return t('Please choose your clinic type.');
  if (!isValidBusinessName(biz.name)) return t('Clinic name must be 2–{max} characters.', { max: BUSINESS_NAME_MAX });
  if (biz.address.trim().length > ADDRESS_MAX) return t('Address can be at most {max} characters.', { max: ADDRESS_MAX });
  if (!isValidLocalPhoneDigits(biz.phone)) return t('Enter a valid {n}-digit phone number after +92 (e.g. 3001234567).', { n: PH_LOCAL_PHONE_LEN });
  if (POOL_BOOKING_TYPES.includes(biz.type)) {
    const rooms = Number(biz.totalRooms);
    if (biz.totalRooms !== '' && (!Number.isInteger(rooms) || rooms < 1 || rooms > ROOMS_MAX)) return `Total must be a whole number from 1 to ${ROOMS_MAX}.`;
    const price = Number(biz.pricePerNight);
    if (biz.pricePerNight !== '' && (!Number.isFinite(price) || price < 0 || price > PRICE_MAX)) return `Price must be between 0 and ${PRICE_MAX.toLocaleString()}.`;
  }
  return '';
}
import './AdminAuth.css';
import './AdminRegister.css';
import { t } from '../../i18n';

// Same icon set as BusinessCard.jsx's TYPE_ICONS, so a type reads
// consistently everywhere it appears — not just at registration.
// Grouped to mirror /index's 6 revamped category cards (see HomePageV2.jsx)
// so a new owner picks the same mental category a customer would browse
// under. Purely a display grouping — every `value` here is still the exact
// business.type string the rest of the app (firestore.rules, useBusinesses
// filters, BusinessCard icons) already expects; nothing underneath changed.
// "Clinic" appears twice (Salon & Personal Care + would-be HealthCare) with
// different labels since CategoryActionsPage already sends customers to the
// same type=clinic browse from both the Salon and HealthCare category
// pages — no separate sub-type field exists to tell them apart.
// Padel Club has no matching home category card yet, so it's grouped under
// "Other" rather than forced into one it doesn't belong to. Education has
// no business type at all yet (its category actions are still "Coming
// Soon"), so nothing is added for it here.
const BUSINESS_TYPE_GROUPS = [
  {
    category: 'Restaurants',
    types: [
      { value: 'restaurant', label: 'Restaurant', icon: <Utensils size={22} /> },
    ],
  },
  {
    category: 'Travel',
    types: [
      { value: 'hotel', label: 'Hotel', icon: <Hotel size={22} /> },
    ],
  },
  {
    category: 'HealthCare',
    types: [
      // Firestore's business.type value stays 'sehatkamla' (unchanged since
      // launch) — only the label shown here is "HealthCare".
      { value: 'sehatkamla', label: 'HealthCare', icon: <HeartPulse size={22} /> },
    ],
  },
  {
    category: 'Salon & Personal Care',
    types: [
      { value: 'salon',  label: 'Salon',            icon: <Scissors size={22} /> },
      { value: 'clinic', label: 'Aesthetic Clinic',  icon: <Stethoscope size={22} /> },
    ],
  },
  {
    category: 'Wedding',
    types: [
      { value: 'nayasaa',  label: 'Attire Rental' /* was: 'Nayasaa (Attire Rental)' */, icon: <Gem size={22} /> },
      { value: 'rasoomat', label: 'Video/Photography' /* was: 'Rasoomat (Photo/Video)' */,  icon: <Camera size={22} /> },
      // Same plain slot-engine reuse as Rasoomat (event date + time slot,
      // no room-pool) — see BookingPage.jsx's per-type notes placeholder.
      { value: 'catering', label: 'Catering',                icon: <ChefHat size={22} /> },
      { value: 'makeup',    label: 'Makeup at Home',         icon: <Sparkles size={22} /> },
      { value: 'carrental', label: 'Wedding Car Rental',     icon: <Car size={22} /> },
      { value: 'eventmanagement', label: 'Event Management', icon: <PartyPopper size={22} /> },
      // Same plain slot-engine reuse as Catering (appointment slot, no room-pool).
      { value: 'carvalet', label: 'Car Valet', icon: <ParkingCircle size={22} /> },
    ],
  },
  {
    category: 'Education',
    types: [
      // Same plain slot-engine reuse as Rasoomat/Catering (appointment slot,
      // no room-pool) — the Visit/Online choice is its one extra field, see
      // BookingPage.jsx's per-type consultation-mode checkbox.
      { value: 'studyabroad', label: 'Study Abroad', icon: <GraduationCap size={22} /> },
    ],
  },
  {
    category: 'Entertainment',
    types: [
      // 3rd room-pool type alongside hotel/nayasaa — check-in/check-out by
      // night, real guest count (see BeachHutsBookingPage.jsx, forked from
      // HotelBookingPage.jsx).
      { value: 'beachhuts', label: 'Beach Huts', icon: <Palmtree size={22} /> },
      // Was its own "Other" group (no matching home category card at the
      // time); wired into Entertainment on request — value/icon unchanged,
      // already whitelisted in firestore.rules.
      { value: 'padel', label: 'Padel Club', icon: <LandPlot size={22} /> },
    ],
  },
  // Old "Other" (Padel Club) grouping — superseded by Entertainment above.
  // {
  //   category: 'Other',
  //   types: [
  //     { value: 'padel', label: 'Padel Club', icon: <LandPlot size={22} /> },
  //   ],
  // },
];

// Business types that rent out a pool of named items by date range (rooms,
// outfits) instead of appointment slots — share the same Total
// Units/Price-per-day fields and totalRooms/pricePerNight data shape.
const POOL_BOOKING_TYPES = ['hotel', 'nayasaa', 'beachhuts'];

const DEFAULT_HOURS = {
  mon: { open: '09:00', close: '21:00' },
  tue: { open: '09:00', close: '21:00' },
  wed: { open: '09:00', close: '21:00' },
  thu: { open: '09:00', close: '21:00' },
  fri: { open: '09:00', close: '21:00' },
  sat: { open: '09:00', close: '21:00' },
  sun: { open: '09:00', close: '21:00' },
};

export default function AdminRegister() {
  const { register, user, login, logout, fetchUserProfile, updateBusinessId } = useAuth();
  const { create } = useBusinesses();
  const { update: updateUser } = useUsers();
  const navigate = useNavigate();
  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null); // 'terms' | 'privacy' | null — LegalModal
  const [showNotice, setShowNotice] = useState(true);

  const [account, setAccount] = useState({ email: '', password: '', name: '' });
  const [biz, setBiz] = useState({
    // Naqatar: clinic-only — the type is fixed, the owner picks Medical/Aesthetic below.
    name: '', type: 'clinic', description: '', address: '', phone: '', slotDuration: 30, slotCapacity: 1,
    offersOrdering: false,   // restaurants only — also take QunjeeEats food orders (F2)
    totalRooms: 5, pricePerNight: '',   // hotels & nayasaa — room/outfit-pool booking
    category: '',   // sehatkamla only — which of the 6 HealthCare categories this vendor serves
    categories: [],   // nayasaa only — a rental shop can offer more than one collection at once
    salonGender: '',   // salon only — stored as 'male'/'female', shown to the owner as Gents/Ladies (see /index/salon's split tiles)
    clinicType: '',   // clinic only — 'aesthetic' or 'medical', decides whether this vendor surfaces under Salon & Personal Care's Aesthetic Clinic browse or HealthCare's Clinic Appointment browse (see CategoryActionsPage.jsx + LandingPage.jsx)
  });

  // const handleAccountStep = (e) => {
  //   e.preventDefault();
  //   setStep(1);
  // };
  // 2026-11-17: step-1 validation (native `required` let "   " / "123" through).
  const handleAccountStep = (e) => {
    e.preventDefault();
    if (!isValidName(account.name)) {
      toast.error(t('Please enter your real name (letters only, at least 2).'));
      return;
    }
    const email = account.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > EMAIL_MAX) {
      toast.error(t('Please enter a valid email address.'));
      return;
    }
    if (account.password.length < 6 || account.password.length > PASSWORD_MAX) {
      toast.error(t('Password must be 6–{max} characters.', { max: PASSWORD_MAX }));
      return;
    }
    if (account.password.trim() !== account.password) {
      toast.error(t('Password cannot start or end with a space.'));
      return;
    }
    setAccount(a => ({ ...a, name: a.name.trim().replace(/\s+/g, ' '), email }));
    setStep(1);
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    // 2026-11-17: block bad step-2 input with a reason (toast), not just a
    // disabled button.
    const problem = businessStepError(biz);
    if (problem) { toast.error(problem); return; }
    setLoading(true);
    try {
      let firebaseUser;
      try {
        firebaseUser = await register(account.email, account.password, account.name, '', 'businessAdmin');
      } catch (err) {
        if (err.code !== 'auth/email-already-in-use') throw err;
        // Most likely a previous attempt got this far, created the Auth
        // account, then failed below before the business doc was written
        // (create() can fail on a transient permission race right after
        // sign-up) — sign back into that same account and resume instead of
        // dead-ending the owner on an email they can now never register
        // again with no way to finish setting up their business.
        let resumedUser, profile;
        try {
          const result = await login(account.email, account.password, 'businessAdmin');
          resumedUser = result.user;
          profile = await fetchUserProfile(resumedUser.uid);
        } catch {
          throw err; // wrong password / role mismatch / etc. — surface the original error below
        }
        if (profile?.businessId) {
          // Already has a business — a genuine duplicate registration
          // attempt, not our orphaned-account case. Sign back out and fall
          // through to the original error message.
          await logout();
          throw err;
        }
        firebaseUser = resumedUser;
      }

      // Force a fresh ID token before the next write — right after
      // createUserWithEmailAndPassword/signInWithEmailAndPassword, the
      // SDK's cached token can lag a tick behind request.auth on the
      // Firestore side, occasionally failing the create() below with
      // permission-denied on a brand-new account.
      await firebaseUser.getIdToken(true);

      const takesOrders = biz.type === 'restaurant' && !!biz.offersOrdering;
      const businessId = await create({
        ...biz,
        // 2026-11-17: trimmed text + phone stored as "92XXXXXXXXXX" (same
        // scheme as the customer forms) — /find-business searches this field.
        name:        biz.name.trim().replace(/\s+/g, ' '),
        address:     biz.address.trim(),
        description: biz.description.trim(),
        phone:       toFullPhone(biz.phone),
        // Hybrid restaurant: bookable (it just configured slots/hours) AND
        // listed on QunjeeEats — see LandingPage's browse filter.
        offersOrdering: takesOrders,
        offersBooking:  takesOrders,
        totalRooms:     Number(biz.totalRooms) || 5,
        pricePerNight:  biz.pricePerNight ? Number(biz.pricePerNight) : null,
        // Only sehatkamla vendors carry a single category — everyone else
        // gets null rather than a stray empty string sitting in their document.
        category: biz.type === 'sehatkamla' ? biz.category : null,
        salonGender: biz.type === 'salon' ? biz.salonGender : null,
        clinicType: biz.type === 'clinic' ? biz.clinicType : null,
        // Nayasaa/Rasoomat vendors can offer more than one category at once
        // (e.g. a rental shop offering Bridal+Groom, or a photographer who
        // also shoots video), so this is an array rather than the single
        // HealthCare-style category field.
        categories: ['nayasaa', 'rasoomat'].includes(biz.type) ? biz.categories : null,
        adminUid: firebaseUser.uid,
        workingHours: DEFAULT_HOURS,
        email: account.email,
        // Self-serve registrations start hidden from public listings until a
        // SuperAdmin reviews and approves them (see Dashboard.jsx's pending
        // state and SuperAdmin's Danger Zone > Reactivate).
        isActive: false,
      });
      // updateBusinessId(businessId) — stale-closure bug: it reads `user`
      // from this component's last render before register()/login() ran
      // (still null), so its `if (!user) return` guard always no-ops here
      // and businessId never actually got written. Kept per project policy
      // (never delete, only comment out) — write it directly with the uid
      // we already have instead.
      // await updateBusinessId(businessId);
      await updateUser(firebaseUser.uid, { businessId });
      toast.success(t('Clinic registered! Waiting for approval.'));
      navigate('/admin/dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') toast.error(t('Email already registered. Please sign in.'));
      else toast.error(t('Registration failed. Try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Pops up on load instead of sitting as a easy-to-skip inline banner
          (see commented .register-notice below, kept per project policy —
          never delete, only comment out). */}
      {showNotice && (
        <div className="notice-modal-overlay" onClick={() => setShowNotice(false)}>
          <div className="notice-modal-card" onClick={e => e.stopPropagation()}>
            <AlertTriangle size={36} className="notice-modal-icon" />
            <h2 className="notice-modal-title">{t('Please Read Before You Continue')}</h2>
            <p className="notice-modal-text">
              {t('Please read carefully before creating your clinic account.')} <strong>{t('Your clinic type (Medical/Aesthetic) cannot be changed later')}</strong>{t(', and these details are what customers will see when they book with you.')}
            </p>
            <button type="button" className="btn btn-primary btn-full" onClick={() => setShowNotice(false)}>
              {t('Got It, Continue')}
            </button>
          </div>
        </div>
      )}
      <div className="auth-card card fade-up" style={{ maxWidth: 500 }}>
        <div className="auth-brand">
          {/* <img src="/qunjee-logo.png" alt="Qunjee" className="auth-logo-img" /> */}
          {/* <img src="/qufree-logo.png" alt="Qufree" className="auth-logo-img" /> */}
          <img src="/brand/naqatar-lockup.png" alt="Naqatar" className="auth-logo-img" width={522} height={160} />
          <span className="auth-brand-tag">{t('Business')}</span>
        </div>

        <h1 className="auth-title">{t('Register Your Clinic')}</h1>
        <p className="auth-sub">{step === 0 ? t('Step 1 of 2 — Create your account') : t('Step 2 of 2 — Clinic details')}</p>

        {/*
        <div className="register-notice">
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Kindly pay full attention before creating your business account — your <strong>business type cannot be changed later</strong>, and these details are what customers will see when they book with you.</span>
        </div>
        */}

        {step === 0 && (
          <form onSubmit={handleAccountStep} className="fade-up">
            <div className="form-group">
              <label className="form-label">{t('Your Name')}</label>
              {/* <input className="form-control" placeholder="Muhammad Ali"
                value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} required /> */}
              <input className="form-control" placeholder="Muhammad Ali" autoComplete="name" maxLength={NAME_MAX}
                value={account.name} onChange={e => setAccount(a => ({ ...a, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Email')}</label>
              <div className="input-icon-wrap">
                <Mail size={16} className="input-icon" />
                {/* <input className="form-control input-with-icon" type="email" placeholder="business@email.com"
                  value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} required /> */}
                <input className="form-control input-with-icon" type="email" placeholder={t('clinic@email.com')} autoComplete="email" maxLength={EMAIL_MAX}
                  value={account.email} onChange={e => setAccount(a => ({ ...a, email: e.target.value }))} required />
              </div>
              <EmailTypoHint email={account.email} onFix={email => setAccount(a => ({ ...a, email }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Password')}</label>
              <div className="input-icon-wrap">
                <Lock size={16} className="input-icon" />
                {/* <input className="form-control input-with-icon" type="password" placeholder="Min 6 characters"
                  value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} required minLength={6} /> */}
                <input className="form-control input-with-icon" type="password" placeholder={t('Min 6 characters')} autoComplete="new-password" maxLength={PASSWORD_MAX}
                  value={account.password} onChange={e => setAccount(a => ({ ...a, password: e.target.value }))} required minLength={6} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label consent-check" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  style={{ marginTop: '0.2rem' }} required />
                <span>
                  {t('I agree to the')}{' '}
                  {/* <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link> */}
                  <a href="/terms" onClick={e => { e.preventDefault(); setLegalDoc('terms'); }}>{t('Terms of Service')}</a>{' '}
                  {t('and')}{' '}
                  {/* <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link> */}
                  <a href="/privacy" onClick={e => { e.preventDefault(); setLegalDoc('privacy'); }}>{t('Privacy Policy')}</a>.
                </span>
              </label>
            </div>

            <button className="btn btn-primary btn-full" type="submit" disabled={!agreed}>{t('Next')}</button>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleFinish} className="fade-up">
            {/* Business type — button-grid version kept commented per project
                policy (never delete, only comment out), replaced below with
                a single dropdown so the picker isn't 13 buttons on load.
            <div className="form-group">
              <label className="form-label">Business Type *</label>
              <div className="type-groups">
                {BUSINESS_TYPE_GROUPS.map(group => (
                  <div key={group.category} className="type-group">
                    <span className="type-group-label">{group.category}</span>
                    <div className="type-selector">
                      {group.types.map(t => (
                        <button key={t.value} type="button"
                          className={`type-btn ${biz.type === t.value ? 'active' : ''}`}
                          onClick={() => setBiz(b => ({ ...b, type: t.value }))}>
                          <span className="type-btn-icon">{t.icon}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            */}
            {/* Naqatar: no business-type picker — every registration is a
                clinic (biz.type is fixed to 'clinic' in state above). */}

            {/* Rest of the form stays hidden until a type is picked — most
                fields below (slot vs. pool, category pickers) depend on it,
                so showing them first is a dead end for the owner anyway. */}
            {biz.type && (
            <>
            {biz.type === 'restaurant' && (
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={biz.offersOrdering}
                    onChange={e => setBiz(b => ({ ...b, offersOrdering: e.target.checked }))} />
                  Active (Pre-food ordering)?
                </label>
              </div>
            )}

            {biz.type === 'sehatkamla' && (
              <div className="form-group">
                <label className="form-label">HealthCare Category *</label>
                <select className="form-control" value={biz.category}
                  onChange={e => setBiz(b => ({ ...b, category: e.target.value }))} required>
                  <option value="" disabled>Select the service you provide</option>
                  {HEALTHCARE_CATEGORIES.map(c => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
                <p className="form-hint">Customers find you by browsing this category on /healthcare.</p>
              </div>
            )}

            {biz.type === 'salon' && (
              <div className="form-group">
                <label className="form-label">Salon For *</label>
                <div className="type-selector">
                  <button type="button" className={`type-btn ${biz.salonGender === 'female' ? 'active' : ''}`}
                    onClick={() => setBiz(b => ({ ...b, salonGender: 'female' }))}>
                    Ladies
                  </button>
                  <button type="button" className={`type-btn ${biz.salonGender === 'male' ? 'active' : ''}`}
                    onClick={() => setBiz(b => ({ ...b, salonGender: 'male' }))}>
                    Gents
                  </button>
                </div>
                <p className="form-hint">Customers find you under Men's or Women's Salon on /index/salon.</p>
              </div>
            )}

            {biz.type === 'clinic' && (
              <div className="form-group">
                <label className="form-label">{t('Clinic Type *')}</label>
                <div className="type-selector">
                  <button type="button" className={`type-btn ${biz.clinicType === 'aesthetic' ? 'active' : ''}`}
                    onClick={() => setBiz(b => ({ ...b, clinicType: 'aesthetic' }))}>
                    {t('Aesthetic / Cosmetic')}
                  </button>
                  <button type="button" className={`type-btn ${biz.clinicType === 'medical' ? 'active' : ''}`}
                    onClick={() => setBiz(b => ({ ...b, clinicType: 'medical' }))}>
                    {t('Medical / General')}
                  </button>
                </div>
                <p className="form-hint">{t('Customers find you under the Medical or Aesthetic tab on the home page.')}</p>
              </div>
            )}

            {biz.type === 'nayasaa' && (
              <div className="form-group">
                <label className="form-label">Nayasaa Categories * <span className="form-hint" style={{ fontWeight: 400 }}>(select all that apply)</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {NAYASAA_CATEGORIES.map(c => (
                    <label key={c.slug} className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={biz.categories.includes(c.slug)}
                        onChange={e => setBiz(b => ({
                          ...b,
                          categories: e.target.checked
                            ? [...b.categories, c.slug]
                            : b.categories.filter(s => s !== c.slug),
                        }))}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
                <p className="form-hint">Customers find you by browsing any of these categories on /nayasaa.</p>
              </div>
            )}

            {biz.type === 'rasoomat' && (
              <div className="form-group">
                <label className="form-label">Rasoomat Categories * <span className="form-hint" style={{ fontWeight: 400 }}>(select all that apply)</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {RASOOMAT_CATEGORIES.map(c => (
                    <label key={c.slug} className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={biz.categories.includes(c.slug)}
                        onChange={e => setBiz(b => ({
                          ...b,
                          categories: e.target.checked
                            ? [...b.categories, c.slug]
                            : b.categories.filter(s => s !== c.slug),
                        }))}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
                <p className="form-hint">Customers find you by browsing any of these categories on /rasoomat.</p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t('Clinic Name *')}</label>
              <div className="input-icon-wrap">
                <Building2 size={16} className="input-icon" />
                {/* <input className="form-control input-with-icon" placeholder="e.g. Café Milano"
                  value={biz.name} onChange={e => setBiz(b => ({ ...b, name: e.target.value }))} required /> */}
                <input className="form-control input-with-icon" placeholder={t('e.g. CareFirst Clinic')} maxLength={BUSINESS_NAME_MAX}
                  value={biz.name} onChange={e => setBiz(b => ({ ...b, name: e.target.value }))} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('Address')}</label>
              <div className="input-icon-wrap">
                <MapPin size={16} className="input-icon" />
                {/* <input className="form-control input-with-icon" placeholder="Street, City"
                  value={biz.address} onChange={e => setBiz(b => ({ ...b, address: e.target.value }))} /> */}
                <input className="form-control input-with-icon" placeholder={t('Street, City')} maxLength={ADDRESS_MAX} autoComplete="street-address"
                  value={biz.address} onChange={e => setBiz(b => ({ ...b, address: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('Phone *')}</label>
              {/* <div className="input-icon-wrap">
                <Phone size={16} className="input-icon" />
                <input className="form-control input-with-icon" type="tel" placeholder="03XX-XXXXXXX"
                  value={biz.phone} onChange={e => setBiz(b => ({ ...b, phone: e.target.value }))} required />
              </div> */}
              {/* 2026-11-17: fixed +92 + 10 digits (same as the customer forms).
                  This is the number customers type on /find-business. */}
              <div className="phone-input-group">
                <span className="phone-input-prefix">+92</span>
                <input className="form-control" type="tel" inputMode="numeric" autoComplete="tel-national"
                  placeholder="3001234567" maxLength={PH_LOCAL_PHONE_LEN}
                  value={biz.phone}
                  onChange={e => {
                    // digits only; a pasted "+92 300…"/"92300…"/"0300…" keeps just the local part
                    let d = e.target.value.replace(/\D/g, '');
                    if (d.startsWith('92') && d.length > PH_LOCAL_PHONE_LEN) d = d.slice(2);
                    if (d.startsWith('0')) d = d.slice(1);
                    setBiz(b => ({ ...b, phone: d.slice(0, PH_LOCAL_PHONE_LEN) }));
                  }}
                  required />
              </div>
              <p className="form-hint">{t('Customers will find your clinic on Naqatar by this number.')}</p>
            </div>
            <div className="form-group">
              <label className="form-label">{t('Description')}</label>
              <textarea className="form-control" placeholder={t('Brief description of your clinic…')} rows={2} maxLength={300}
                value={biz.description} onChange={e => setBiz(b => ({ ...b, description: e.target.value }))} />
              <p className="form-hint" style={{ textAlign: 'right', margin: '0.25rem 0 0' }}>{biz.description.length}/300</p>
            </div>
            {POOL_BOOKING_TYPES.includes(biz.type) ? (
              <>
                <div className="form-group">
                  <label className="form-label">{biz.type === 'nayasaa' ? 'Total Units' : biz.type === 'beachhuts' ? 'Total Huts' : 'Total Rooms'}</label>
                  {/* <input className="form-control" type="number" min="1" placeholder="e.g. 10"
                    value={biz.totalRooms} onChange={e => setBiz(b => ({ ...b, totalRooms: e.target.value }))} /> */}
                  <input className="form-control" type="number" min="1" max={ROOMS_MAX} step="1" inputMode="numeric" placeholder="e.g. 10"
                    value={biz.totalRooms} onChange={e => setBiz(b => ({ ...b, totalRooms: e.target.value }))} />
                  <p className="form-hint">{biz.type === 'nayasaa'
                    ? 'How many of this outfit/design are available to rent at once.'
                    : biz.type === 'beachhuts'
                    ? 'How many huts are available to book at once.'
                    : 'How many rooms are available to book at once.'}</p>
                </div>
                <div className="form-group">
                  {/* <label className="form-label">{biz.type === 'nayasaa' ? 'Price per Day (optional)' : 'Price per Night (optional)'}</label> */}
                  <label className="form-label">{['nayasaa', 'beachhuts'].includes(biz.type) ? 'Price per Day (optional)' : 'Price per Night (optional)'}</label>
                  {/* <input className="form-control" type="number" min="0" placeholder="e.g. 15000"
                    value={biz.pricePerNight} onChange={e => setBiz(b => ({ ...b, pricePerNight: e.target.value }))} /> */}
                  <input className="form-control" type="number" min="0" max={PRICE_MAX} step="1" inputMode="numeric" placeholder="e.g. 15000"
                    value={biz.pricePerNight} onChange={e => setBiz(b => ({ ...b, pricePerNight: e.target.value }))} />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">{t('Appointment Slot Duration (minutes)')}</label>
                  <select className="form-control" value={biz.slotDuration} onChange={e => setBiz(b => ({ ...b, slotDuration: Number(e.target.value) }))}>
                    {[15, 20, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{t('{n} min', { n: v })}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Capacity per Slot')}</label>
                  <select className="form-control" value={biz.slotCapacity} onChange={e => setBiz(b => ({ ...b, slotCapacity: Number(e.target.value) }))}>
                    {[1, 2, 3, 4, 5, 6, 8, 10].map(v => <option key={v} value={v}>{t(v === 1 ? '{n} booking at a time' : '{n} bookings at a time', { n: v })}</option>)}
                  </select>
                  <p className="form-hint">{t('How many bookings the same time slot can hold (e.g. doctors, rooms).')}</p>
                </div>
              </>
            )}
            </>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>{t('Back')}</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}
                // disabled={loading || !biz.type || !biz.name || !biz.phone
                disabled={loading || !biz.type || !biz.name.trim() || !isValidLocalPhoneDigits(biz.phone)
                  || (biz.type === 'sehatkamla' && !biz.category)
                  || (biz.type === 'salon' && !biz.salonGender)
                  || (biz.type === 'clinic' && !biz.clinicType)
                  || (['nayasaa', 'rasoomat'].includes(biz.type) && biz.categories.length === 0)}>
                {loading ? t('Registering…') : t('Register Clinic')}
              </button>
            </div>
          </form>
        )}

        <p className="auth-footer">
          {t('Already registered?')} <Link to="/admin/login">{t('Sign In')}</Link>
        </p>

        {/* Outside every <form> on purpose — keeps the popup's buttons from ever
            submitting the signup form. */}
        <LegalModal doc={legalDoc} onOpenDoc={setLegalDoc} onClose={() => setLegalDoc(null)} />
      </div>
    </div>
  );
}
