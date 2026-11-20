import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Check, ChevronLeft, LogIn, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useServices }   from '../../hooks/useServices';
import { useBooking, SlotUnavailableError } from '../../hooks/useBooking';
import { bookingRef, formatTime12h } from '../../utils/format';
import { isValidLocalPhoneDigits, toFullPhone, stripCountryCode, PH_LOCAL_PHONE_LEN } from '../../utils/validation';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { useReminders }  from '../../hooks/useReminders';
import SlotPicker from '../../components/public/SlotPicker';
import BankDetailsCard from '../../components/shared/BankDetailsCard';
import InAppBrowserNotice from '../../components/shared/InAppBrowserNotice';
import { googleErrorMessage } from '../../utils/authErrors';
import './BookingPage.css';
import { t } from '../../i18n';
import { useBusy } from '../../context/BusyContext';

const STEPS = ['Service', 'Date & Time', 'Confirm'];

// Booking choices survive a redirect-based Google sign-in (the page reloads),
// so the customer lands back on step 3 with the same services, day and time.
const DRAFT_KEY = 'naqatar:bookingDraft';
const readDraft = () => { try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } };
const clearDraft = () => { try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } };

export default function BookingPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectServiceId = searchParams.get('service');
  const { user, userProfile, login, loginWithGoogle } = useAuth();

  const { fetchOne }   = useBusinesses();
  const { services, fetchAll } = useServices(businessId);
  const { bookAppointment } = useBooking();
  const { sendBookingReceived } = useEmailNotifications();

  const [business, setBusiness]     = useState(null);
  const [step, setStep]             = useState(0);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ScrollToTop (App.jsx) only fires on a route change — this wizard stays
  // on one route across all 3 steps, so without this, "Next"/"Back" leaves
  // the customer scrolled wherever they were on the previous step.
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  // Booking state — services is a list now: one appointment can bundle
  // several bookable services ("Haircut + Manicure") into one slot-claim.
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate]       = useState(null);
  const [selectedTime, setSelectedTime]       = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  // Study Abroad Consultation only — whether the customer wants an
  // in-person Visit or an Online consultation. Unused (stays false) for
  // every other business type.
  const [isOnline, setIsOnline] = useState(false);
  const [savedApptId, setSavedApptId]         = useState(null);
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  // Customer opt-out of the business's advance-payment requirement — pay
  // Cash Over Counter (COC) at the business instead of transferring online.
  // Not "COD": these are in-person slot bookings, nothing is delivered.
  // Checkbox added 2026-09-11.
  const [payAtCounter, setPayAtCounter] = useState(false);

  // Inline login state (used on Step 3 gate)
  const [loginForm, setLoginForm]     = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const { withBusy } = useBusy();

  // Pre-fill form when user signs in. Email is FORCED to the account email so
  // the booking stays readable by its owner (rules match on auth token email).
  useEffect(() => {
    if (user && userProfile) {
      setForm(f => ({
        ...f,
        name:  f.name  || userProfile.displayName || '',
        email: user.email || f.email || '',
        phone: f.phone || stripCountryCode(userProfile.phone) || '',
      }));
    }
  }, [user, userProfile]);

  useReminders(savedApptId, savedApptId ? buildDatetime(selectedDate, selectedTime) : null);

  useEffect(() => {
    Promise.all([
      fetchOne(businessId).then(b => setBusiness(b)),
      fetchAll(),
    ]).finally(() => setLoading(false));
  }, [businessId]);

  // Preselect whichever service the customer already picked before landing
  // here — either the one "Book" link they clicked on the business page, or
  // (if there's only one option anyway) the only choice, so they're not
  // stuck re-picking something they already chose. Either way it's just a
  // starting point — they can still add more from the list.
  useEffect(() => {
    if (selectedServices.length > 0 || services.length === 0) return;
    const draft = readDraft();
    if (draft?.businessId === businessId) {
      clearDraft();
      const picked = services.filter(s => draft.serviceIds?.includes(s.id));
      if (picked.length) {
        setSelectedServices(picked);
        if (draft.date && draft.time) {
          setSelectedDate(new Date(draft.date));
          setSelectedTime(draft.time);
          setStep(2);
        }
        return;
      }
    }
    const linked = preselectServiceId && services.find(s => s.id === preselectServiceId);
    if (linked) setSelectedServices([linked]);
    else if (services.length === 1) setSelectedServices([services[0]]);
  }, [services, preselectServiceId]);

  const toggleService = (s) => {
    setSelectedServices(prev =>
      prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]
    );
  };

  const totalDuration = selectedServices.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);
  const hasAnyPrice    = selectedServices.some(s => s.price != null);
  const totalPrice     = hasAnyPrice ? selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0) : null;

  function buildDatetime(date, time) {
    if (!date || !time) return null;
    const [h, m] = time.split(':').map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);
    return dt;
  }

  const canNext = () => {
    if (step === 0) return selectedServices.length > 0;
    if (step === 1) return !!selectedDate && !!selectedTime;
    return true;
  };

  const canSubmit = () => !!user && !!form.name && isValidLocalPhoneDigits(form.phone) && !!form.email
    && (!business.requiresAdvancePayment || payAtCounter || !!paymentProofFile);

  const handleGoogleSignIn = async () => {
    setLoginLoading(true);
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        businessId,
        serviceIds: selectedServices.map(s => s.id),
        date: selectedDate ? selectedDate.toISOString() : null,
        time: selectedTime,
      }));
    } catch { /* ignore */ }
    try {
      await withBusy(() => loginWithGoogle('customer'));
      clearDraft();
      toast.success(t('Signed in!'));
    } catch (err) {
      const msg = googleErrorMessage(err);
      if (msg) { clearDraft(); toast.error(msg); }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success(t('Signed in!'));
    } catch {
      toast.error(t('Invalid email or password.'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValidLocalPhoneDigits(form.phone)) {
      toast.error(t('Please enter a valid {n}-digit phone number.', { n: PH_LOCAL_PHONE_LEN }));
      return;
    }
    setSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      // Belt-and-braces: booking email always matches the signed-in account.
      const bookingEmail = user?.email || form.email;
      const fullPhone = toFullPhone(form.phone);

      // Anti-spam gate: business requires proof of advance payment before the
      // slot is held. Uploaded under the customer's own uid so storage.rules
      // can check ownership without needing the not-yet-created appointment id.
      let paymentProofUrl = null;
      if (business.requiresAdvancePayment && !payAtCounter && paymentProofFile) {
        const fileRef = ref(storage, `payment-proofs/${user.uid}/${Date.now()}_${paymentProofFile.name}`);
        await uploadBytes(fileRef, paymentProofFile);
        paymentProofUrl = await getDownloadURL(fileRef);
      }

      // Atomic: creates the appointment and claims the slot(s) in one transaction.
      const id = await bookAppointment({
        business,
        services: selectedServices,
        dateStr,
        time: selectedTime,
        customer: {
          name:  form.name,
          phone: fullPhone,
          email: bookingEmail,
          notes: form.notes,
          uid:   user?.uid || null,
          paymentProofUrl,
          isOnline: business.type === 'studyabroad' ? isOnline : null,
        },
      });
      setSavedApptId(id);

      const apptData = {
        bookingRef:      bookingRef(id),
        businessId,
        businessType:    business.type,
        businessName:    business.name,
        businessAddress: business.address || '',
        serviceId:       selectedServices[0]?.id ?? null,
        serviceName:     selectedServices.map(s => s.name).join(' + '),
        date:            dateStr,
        time:            selectedTime,
        customerName:    form.name,
        customerPhone:   fullPhone,
        customerEmail:   bookingEmail,
        notes:           form.notes,
        servicePrice:    totalPrice,
        requestedAt:     new Date().toISOString(),
      };
      await sendBookingReceived(apptData);

      navigate('/index/confirm', {
        state: {
          appointment: { ...apptData, id },
          appointmentDatetime: buildDatetime(selectedDate, selectedTime)?.toISOString(),
          // Hybrid restaurants (F1): lets the confirmation page offer a
          // dine-in food pre-order for this booking.
          offersOrdering: business.offersOrdering === true,
        },
      });
    } catch (err) {
      if (err instanceof SlotUnavailableError) {
        // Someone grabbed it first — send them back to pick another time.
        toast.error(err.message);
        setSelectedTime(null);
        setStep(1);
      } else {
        toast.error(t('Booking failed. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!business) return <div className="container page"><p>{t('Clinic not found.')}</p></div>;

  return (
    <div className="booking-page page">
      <div className="container booking-container">
        <h1 className="booking-title">{t('Book at {name}', { name: business.name })}</h1>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((label, i) => (
            <>
              <div key={label} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                <div className="step-dot">
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span className="step-label">{t(label)}</span>
              </div>
              {i < STEPS.length - 1 && <div key={`line-${i}`} className={`step-line ${i < step ? 'done' : ''}`} />}
            </>
          ))}
        </div>

        <div className="booking-card card">
          <div className="card-body">

            {/* Step 0 — Service(s) — multi-select, so a customer can bundle
                more than one bookable service (e.g. Haircut + Manicure) into
                this same appointment. */}
            {step === 0 && (
              <div className="fade-up">
                <h2 className="step-heading">{t('Select Service(s)')}</h2>
                {services.length === 0
                  ? <p className="text-muted">{t('No services available.')}</p>
                  : (
                    <div className="service-select-list">
                      {services.map(s => {
                        const checked = selectedServices.some(x => x.id === s.id);
                        return (
                          <button
                            key={s.id}
                            className={`service-select-item ${checked ? 'selected' : ''}`}
                            onClick={() => toggleService(s)}
                          >
                            <span className={`service-select-check ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={13} />}
                            </span>
                            {s.image && <img src={s.image} alt={s.name} className="service-select-thumb" />}
                            <div className="service-select-info">
                              <span className="service-select-name">{s.name}</span>
                              {s.onTop && <span className="badge badge-promo">{t('Promo')}</span>}
                              {s.description && <span className="service-select-desc">{s.description}</span>}
                            </div>
                            <div className="service-select-meta">
                              {s.duration && <span>{t('{n} min', { n: s.duration })}</span>}
                              {s.price     && <span className="service-select-price">PKR {s.price.toLocaleString()}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )
                }
                {selectedServices.length === 0 && services.length > 1 && (
                  <p className="service-select-hint">{t('Tap one or more services above to continue.')}</p>
                )}
                {selectedServices.length > 0 && (
                  <p className="service-select-total">
                    {t(selectedServices.length > 1 ? '{n} services selected' : '{n} service selected', { n: selectedServices.length })}
                    {totalDuration ? ` — ${t('{n} min total', { n: totalDuration })}` : ''}
                    {totalPrice != null ? ` — ${t('PKR {amount} total', { amount: totalPrice.toLocaleString() })}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Step 1 — Date & Time */}
            {step === 1 && (
              <div className="fade-up">
                <h2 className="step-heading">{t('Choose Date & Time')}</h2>
                <SlotPicker
                  business={business}
                  service={{ duration: totalDuration }}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onDateChange={setSelectedDate}
                  onTimeChange={setSelectedTime}
                />
              </div>
            )}

            {/* Step 2 — Sign in (if needed), Details & Confirm */}
            {step === 2 && (
              <div className="fade-up">
                {!user ? (
                  <div className="booking-auth-gate">
                    <div className="auth-gate-icon"><LogIn size={30} /></div>
                    <h2 className="step-heading">{t('Sign In to Continue')}</h2>
                    <p className="auth-gate-sub">{t("A quick sign-in confirms it's really you — no fake or prank bookings. Your date & time are held while you do this.")}</p>

                    <InAppBrowserNotice />

                    <button
                      className="btn btn-ghost btn-full google-btn"
                      onClick={handleGoogleSignIn}
                      disabled={loginLoading}
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} />
                      {t('Continue with Google')}
                    </button>

                    <div className="auth-divider"><span>{t('or')}</span></div>

                    <form onSubmit={handleEmailSignIn}>
                      <div className="form-group">
                        <input
                          className="form-control"
                          type="email"
                          placeholder={t('Email address')}
                          value={loginForm.email}
                          onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          className="form-control"
                          type="password"
                          placeholder={t('Password')}
                          value={loginForm.password}
                          onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                          required
                        />
                      </div>
                      <button className="btn btn-primary btn-full" type="submit" disabled={loginLoading}>
                        {loginLoading ? t('Signing in…') : t('Sign In & Continue')}
                      </button>
                    </form>

                    <p className="auth-gate-footer">
                      {t('New here?')} <Link to="/index/register">{t('Create a free account')}</Link>
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="section-heading">{t('Your Details')}</h2>
                    <div className="form-group">
                      <label className="form-label">{t('Full Name *')}</label>
                      <input className="form-control" placeholder="Muhammad Ali" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('Phone Number *')}</label>
                      <div className="phone-input-group">
                        <span className="phone-input-prefix">+92</span>
                        <input
                          className="form-control"
                          type="tel"
                          inputMode="numeric"
                          placeholder="3XXXXXXXXX"
                          maxLength={PH_LOCAL_PHONE_LEN}
                          value={form.phone}
                          onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, PH_LOCAL_PHONE_LEN) }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('Email Address *')}</label>
                      <input className="form-control" type="email" value={form.email} disabled />
                      <p className="form-hint">{t('Your account email is used so this booking stays linked to your account.')}</p>
                    </div>
                    {business?.type === 'studyabroad' && (
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} />
                          Online consultation (leave unchecked for an in-person Visit)
                        </label>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">{t('Notes (optional)')}</label>
                      <textarea className="form-control" placeholder={business?.type === 'catering' ? 'e.g. guest count, dietary requirements, event details…' : business?.type === 'carvalet' ? 'e.g. pickup/drop location, number of vehicles…' : t('Any special requests…')} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    {business.requiresAdvancePayment && (
                      <div className="payment-proof-block">
                        <h3 className="payment-proof-title">{t('Advance Payment Required')}</h3>
                        {!payAtCounter ? (
                          <>
                            <p className="payment-proof-amount">
                              {t('PKR {amount} — transfer to:', { amount: (totalPrice ?? 0).toLocaleString() })}
                            </p>
                            {/* Per-business bank details hibernated (2026-09-11) — advance
                            payments now go to Qunjee's own account (BankDetailsCard) instead
                            of each business's own bankName/accountTitle/accountNumber.
                            <div className="bank-details-card">
                              <div><span>Bank</span><strong>{business.bankName || '—'}</strong></div>
                              <div><span>Account Title</span><strong>{business.accountTitle || '—'}</strong></div>
                              <div><span>Account Number</span><strong>{business.accountNumber || '—'}</strong></div>
                            </div>
                            */}
                            <BankDetailsCard />
                            <div className="form-group">
                              <label className="form-label">{t('Upload Payment Screenshot *')}</label>
                              <label className="proof-upload-input">
                                <Upload size={16} />
                                <span className="proof-upload-input-label">
                                  {paymentProofFile ? paymentProofFile.name : t('Choose screenshot…')}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={e => setPaymentProofFile(e.target.files?.[0] || null)}
                                />
                              </label>
                              <p className="form-hint">{t('The clinic will verify this before confirming your booking.')}</p>
                            </div>
                            <button type="button" className="payment-proof-coc-toggle" onClick={() => setPayAtCounter(true)}>
                              {t('Prefer to pay cash over the counter instead?')}
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                              {t("You'll pay PKR {amount} in cash at the clinic when you arrive.", { amount: (totalPrice ?? 0).toLocaleString() })}
                            </p>
                            <button type="button" className="payment-proof-coc-toggle" onClick={() => setPayAtCounter(false)}>
                              {t('← Pay online instead')}
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    <h2 className="section-heading section-heading-divided">{t('Confirm Booking')}</h2>
                    <div className="confirm-summary">
                      {[
                        { label: 'Clinic', value: business.name },
                        { label: selectedServices.length > 1 ? 'Services' : 'Service',
                          value: selectedServices.map(s => s.name).join(', ') + (totalPrice != null ? ` — PKR ${totalPrice.toLocaleString()}` : '') },
                        { label: 'Date',     value: selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy') : '' },
                        { label: 'Time',     value: formatTime12h(selectedTime) },
                        ...(form.notes ? [{ label: 'Notes', value: form.notes }] : []),
                      ].map(row => (
                        <div key={row.label} className="confirm-row">
                          <span className="confirm-label">{t(row.label)}</span>
                          <span className="confirm-value">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="confirm-note">
                      {t('A confirmation email will be sent to')} <strong>{form.email}</strong>.{' '}
                      {t("We'll also send you reminders before your appointment! (Check your Spam folder if it doesn't arrive.)")}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navigation — Back and Continue/Confirm grouped together */}
          <div className="booking-nav card-body booking-nav-group" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn btn-ghost btn-nav-back"
              onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)}
            >
              <ChevronLeft size={16} /> {step === 0 ? t('Back') : t('Previous')}
            </button>
            {step < 2 ? (
              <button className="btn btn-primary btn-nav-primary" disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
                {t('Continue')}
              </button>
            ) : user ? (
              <button className="btn btn-primary btn-nav-primary" disabled={submitting || !canSubmit()} onClick={handleSubmit}>
                {submitting ? t('Booking…') : t('Confirm Booking')}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
