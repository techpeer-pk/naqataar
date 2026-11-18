import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { toPng } from 'html-to-image';
import { Check, ChevronLeft, LogIn, CheckCircle, Minus, Plus, CalendarCheck, Home, Download, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidLocalPhoneDigits, toFullPhone, stripCountryCode, PH_LOCAL_PHONE_LEN } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useServices } from '../../hooks/useServices';
import { useRoomBooking, RoomUnavailableError } from '../../hooks/useRoomBooking';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { reservationRef } from '../../utils/format';
import { nightsBetween, toDateStr, parseDateStr } from '../../utils/nights';
import '../public/BookingPage.css';
import '../public/ConfirmationPage.css';
import './HotelBookingPage.css';

// Deliberate fork of HotelBookingPage.jsx, same convention as
// NayasaaBookingPage.jsx (see its own comment on why) — Beach Huts is the
// 3rd room-pool type sharing useRoomBooking()/useEmailNotifications()
// unchanged. Real check-in/check-out + a real guest count (unlike Nayasaa's
// dummy guest count for attire rental), so this fork stays closer to Hotel's
// wording than Nayasaa's — just "Room" swapped for "Hut" throughout.
const STEPS = ['Dates & Huts', 'Your Details', 'Booked!'];

export default function BeachHutsBookingPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectHutId = searchParams.get('hut');
  const { user, userProfile, login, loginWithGoogle } = useAuth();

  const { fetchOne } = useBusinesses();
  const { services, fetchAll: fetchServices } = useServices(businessId);
  const { bookReservation } = useRoomBooking();
  const { sendReservationReceived } = useEmailNotifications();

  const [business, setBusiness]     = useState(null);
  const [step, setStep]             = useState(0);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ScrollToTop (App.jsx) only fires on a route change — this wizard stays
  // on one route across all steps, so without this, "Next"/"Back" leaves
  // the customer scrolled wherever they were on the previous step.
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const todayStr = toDateStr(new Date());
  const [hutType, setHutType]   = useState(null);
  const [checkIn, setCheckIn]   = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [huts, setHuts]         = useState(1);
  const [guests, setGuests]     = useState(1);
  const [form, setForm]         = useState({ name: '', phone: '', email: '', notes: '' });
  const [savedReservation, setSavedReservation] = useState(null);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);

  // Inline login state (used on Step 2 gate)
  const [loginForm, setLoginForm]       = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    if (user && userProfile) {
      setForm(f => ({
        ...f,
        name:  f.name  || userProfile.displayName || '',
        email: user.email || f.email || '',
        // phone: f.phone || userProfile.phone || '',
        phone: f.phone || stripCountryCode(userProfile.phone) || '',
      }));
    }
  }, [user, userProfile]);

  useEffect(() => {
    Promise.all([
      fetchOne(businessId).then(b => setBusiness(b)),
      fetchServices(),
    ]).finally(() => setLoading(false));
  }, [businessId]);

  // Preselect whichever hut type the guest already picked before landing
  // here (the "Book" link on a specific hut-type row), or the only choice
  // if there's just one — same pattern as HotelBookingPage.jsx's room-type
  // preselect.
  useEffect(() => {
    if (hutType || services.length === 0) return;
    const linked = preselectHutId && services.find(s => s.id === preselectHutId);
    if (linked) setHutType(linked);
    else if (services.length === 1) setHutType(services[0]);
  }, [services, preselectHutId]);

  const nights      = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : [];
  const nightCount   = nights.length;
  const nightlyPrice = hutType ? (hutType.price ?? null) : (business?.pricePerNight ?? null);
  const totalPrice   = nightlyPrice != null && nightCount > 0
    ? nightlyPrice * nightCount * huts
    : null;
  const maxHuts      = hutType ? (hutType.totalRooms || 1) : (business?.totalRooms || 1);

  const canNext = () => {
    if (step === 0) return (services.length === 0 || !!hutType) && !!checkIn && !!checkOut && nightCount > 0 && huts >= 1;
    return true;
  };

  // const canSubmit = () => !!user && !!form.name && !!form.phone && !!form.email;
  const canSubmit = () => !!user && !!form.name && isValidLocalPhoneDigits(form.phone) && !!form.email;

  const handleGoogleSignIn = async () => {
    setLoginLoading(true);
    try {
      await loginWithGoogle('customer');
      toast.success('Signed in!');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('Signed in!');
    } catch {
      toast.error('Invalid email or password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValidLocalPhoneDigits(form.phone)) {
      toast.error(`Please enter a valid ${PH_LOCAL_PHONE_LEN}-digit phone number.`);
      return;
    }
    setSubmitting(true);
    try {
      const bookingEmail = user?.email || form.email;
      const id = await bookReservation({
        business,
        roomType: hutType,
        checkIn,
        checkOut,
        rooms: huts,
        guests,
        customer: {
          name:  form.name,
          // phone: form.phone,
          phone: toFullPhone(form.phone), // "92XXXXXXXXXX", same as BookingPage
          email: bookingEmail,
          notes: form.notes,
          uid:   user?.uid || null,
        },
      });
      setSavedReservation({ id, roomTypeName: hutType?.name ?? null, checkIn, checkOut, nights: nightCount, rooms: huts, guests, totalPrice, requestedAt: new Date().toISOString() });

      await sendReservationReceived({
        reservationRef:  reservationRef(id),
        businessType:    business.type,
        businessName:    business.name,
        businessAddress: business.address || '',
        checkIn, checkOut,
        nights:          nightCount,
        roomsRequested:  huts,
        guestCount:      guests,
        totalPrice,
        customerName:    form.name,
        customerEmail:   bookingEmail,
      });

      setStep(2);
    } catch (err) {
      if (err instanceof RoomUnavailableError) {
        toast.error(err.message);
        setStep(0);
      } else if (err.code === 'permission-denied') {
        // Not a bug — the business's booking window has lapsed (subscription
        // trial expired, not yet renewed) so the create rule rejects it.
        toast.error("This business isn't accepting bookings right now. Please contact them directly.");
      } else {
        toast.error('Booking failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // One-tap proof-of-booking image — same as HotelBookingPage.jsx.
  const handleSaveToDevice = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => !node.classList?.contains('no-capture'),
      });
      const link = document.createElement('a');
      link.download = `booking-${reservationRef(savedReservation.id)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error('Could not save image. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!business) return <div className="container page"><p>Business not found.</p></div>;

  return (
    <div className="booking-page hotel-booking-page beachhuts-booking-page page">
      <div className="container booking-container">
        <h1 className="booking-title">Book a Hut at {business.name}</h1>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((label, i) => (
            <>
              <div key={label} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                <div className="step-dot">
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span className="step-label">{label}</span>
              </div>
              {i < STEPS.length - 1 && <div key={`line-${i}`} className={`step-line ${i < step ? 'done' : ''}`} />}
            </>
          ))}
        </div>

        <div className="booking-card card" ref={cardRef}>
          <div className="card-body">

            {/* Step 0 — Hut Type (only when this business has hut-type docs), then Dates & Huts */}
            {step === 0 && (
              <div className="fade-up">
                {services.length > 0 && (
                  <div className="form-group">
                    <h2 className="step-heading">Hut Type</h2>
                    <div className="service-select-list">
                      {services.map(s => {
                        const checked = hutType?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`service-select-item ${checked ? 'selected' : ''}`}
                            onClick={() => setHutType(s)}
                          >
                            <span className={`service-select-check ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={13} />}
                            </span>
                            {s.image && <img src={s.image} alt={s.name} className="service-select-thumb" />}
                            <div className="service-select-info">
                              <span className="service-select-name">{s.name}</span>
                              {s.onTop && <span className="badge badge-promo">Promo</span>}
                              {s.description && <span className="service-select-desc">{s.description}</span>}
                            </div>
                            <div className="service-select-meta">
                              <span>{s.totalRooms || 1} hut{(s.totalRooms || 1) > 1 ? 's' : ''}</span>
                              {/* {s.price && <span className="service-select-price">PKR {s.price.toLocaleString()} / night</span>} */}
                              {s.price && <span className="service-select-price">PKR {s.price.toLocaleString()} / day</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {!hutType && services.length > 1 && (
                      <p className="service-select-hint">Pick a hut type above to continue.</p>
                    )}
                  </div>
                )}

                <h2 className="step-heading">Choose Dates &amp; Huts</h2>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Check-in</label>
                    <input className="form-control" type="date" min={todayStr}
                      value={checkIn}
                      onChange={e => {
                        const v = e.target.value;
                        setCheckIn(v);
                        if (checkOut && checkOut <= v) setCheckOut('');
                      }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Check-out</label>
                    <input className="form-control" type="date"
                      min={checkIn ? toDateStr(addDays(parseDateStr(checkIn), 1)) : todayStr}
                      value={checkOut} disabled={!checkIn}
                      onChange={e => setCheckOut(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Huts</label>
                  <div className="room-stepper">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={huts <= 1}
                      onClick={() => setHuts(r => Math.max(1, r - 1))}>
                      <Minus size={14} />
                    </button>
                    <span className="room-stepper-count">{huts}</span>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={huts >= maxHuts}
                      onClick={() => setHuts(r => Math.min(maxHuts, r + 1))}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="form-hint">Up to {maxHuts} hut{maxHuts > 1 ? 's' : ''} available.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Guests</label>
                  <div className="room-stepper">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={guests <= 1}
                      onClick={() => setGuests(g => Math.max(1, g - 1))}>
                      <Minus size={14} />
                    </button>
                    <span className="room-stepper-count">{guests}</span>
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => setGuests(g => g + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {nightCount > 0 && (
                  <p className="service-select-total">
                    {/* {nightCount} night{nightCount > 1 ? 's' : ''} × {huts} hut{huts > 1 ? 's' : ''} */}
                    {nightCount} day{nightCount > 1 ? 's' : ''} × {huts} hut{huts > 1 ? 's' : ''}
                    {totalPrice != null ? ` — PKR ${totalPrice.toLocaleString()} total` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Step 1 — Sign in (if needed), Details & Confirm */}
            {step === 1 && (
              <div className="fade-up">
                {!user ? (
                  <div className="booking-auth-gate">
                    <div className="auth-gate-icon"><LogIn size={30} /></div>
                    <h2 className="step-heading">Sign In to Continue</h2>
                    <p className="auth-gate-sub">A quick sign-in confirms it's really you — no fake or prank bookings. Your dates are held while you do this.</p>

                    <button
                      className="btn btn-ghost btn-full google-btn"
                      onClick={handleGoogleSignIn}
                      disabled={loginLoading}
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} />
                      Continue with Google
                    </button>

                    <div className="auth-divider"><span>or</span></div>

                    <form onSubmit={handleEmailSignIn}>
                      <div className="form-group">
                        <input
                          className="form-control"
                          type="email"
                          placeholder="Email address"
                          value={loginForm.email}
                          onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <input
                          className="form-control"
                          type="password"
                          placeholder="Password"
                          value={loginForm.password}
                          onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                          required
                        />
                      </div>
                      <button className="btn btn-primary btn-full" type="submit" disabled={loginLoading}>
                        {loginLoading ? 'Signing in…' : 'Sign In & Continue'}
                      </button>
                    </form>

                    <p className="auth-gate-footer">
                      New here? <Link to="/index/register">Create a free account</Link>
                    </p>
                  </div>
                ) : (
                  <>
                    <h2 className="section-heading">Your Details</h2>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className="form-control" placeholder="Muhammad Ali" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      {/* <input className="form-control" type="tel" placeholder="03XX-XXXXXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /> */}
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
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input className="form-control" type="email" value={form.email} disabled />
                      <p className="form-hint">Your account email is used so this booking stays linked to your account.</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notes (optional)</label>
                      <textarea className="form-control" placeholder="Any special requests…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    <h2 className="section-heading section-heading-divided">Confirm Booking</h2>
                    <div className="confirm-summary">
                      {[
                        { label: 'Business',  value: business.name },
                        ...(hutType ? [{ label: 'Hut Type', value: hutType.name }] : []),
                        { label: 'Check-in',  value: format(parseDateStr(checkIn), 'EEEE, d MMMM yyyy') },
                        { label: 'Check-out', value: format(parseDateStr(checkOut), 'EEEE, d MMMM yyyy') },
                        // { label: 'Huts',      value: `${huts} hut${huts > 1 ? 's' : ''} — ${nightCount} night${nightCount > 1 ? 's' : ''}${totalPrice != null ? ` — PKR ${totalPrice.toLocaleString()}` : ''}` },
                        { label: 'Huts',      value: `${huts} hut${huts > 1 ? 's' : ''} — ${nightCount} day${nightCount > 1 ? 's' : ''}${totalPrice != null ? ` — PKR ${totalPrice.toLocaleString()}` : ''}` },
                        { label: 'Guests',    value: `${guests} guest${guests > 1 ? 's' : ''}` },
                        ...(form.notes ? [{ label: 'Notes', value: form.notes }] : []),
                      ].map(row => (
                        <div key={row.label} className="confirm-row">
                          <span className="confirm-label">{row.label}</span>
                          <span className="confirm-value">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Wording matches project_platform_liability_no_confirm_language
                    memory: real confirmation only happens once the business accepts. */}
                    <p className="confirm-note">
                      A receipt will be sent to <strong>{form.email}</strong>. Please check your Spam folder if it doesn't arrive.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Step 2 — Booked! */}
            {step === 2 && savedReservation && (
              <div className="fade-up text-center">
                <div className="confirm-icon"><CheckCircle size={52} /></div>
                <h2 className="confirm-title">Hut Booked!</h2>
                <p className="confirm-sub">Your reservation has been placed successfully.</p>

                <div className="confirm-ref">
                  <span className="confirm-ref-label">Booking ID</span>
                  <span className="confirm-ref-code">{reservationRef(savedReservation.id)}</span>
                </div>

                <div className="confirm-details">
                  {savedReservation.requestedAt && (
                    <div className="confirm-detail-row"><span className="detail-label">Requested</span><span>{new Date(savedReservation.requestedAt).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                  )}
                  <div className="confirm-detail-row"><span className="detail-label">Business</span><span>{business.name}</span></div>
                  {savedReservation.roomTypeName && (
                    <div className="confirm-detail-row"><span className="detail-label">Hut Type</span><span>{savedReservation.roomTypeName}</span></div>
                  )}
                  <div className="confirm-detail-row"><span className="detail-label">Check-in</span><span>{savedReservation.checkIn}</span></div>
                  <div className="confirm-detail-row"><span className="detail-label">Check-out</span><span>{savedReservation.checkOut}</span></div>
                  <div className="confirm-detail-row"><span className="detail-label">Huts</span><span>{savedReservation.rooms} hut{savedReservation.rooms > 1 ? 's' : ''} — {/* {savedReservation.nights} night{savedReservation.nights > 1 ? 's' : ''} */}{savedReservation.nights} day{savedReservation.nights > 1 ? 's' : ''}</span></div>
                  <div className="confirm-detail-row"><span className="detail-label">Guests</span><span>{savedReservation.guests} guest{savedReservation.guests > 1 ? 's' : ''}</span></div>
                  {savedReservation.totalPrice != null && (
                    <div className="confirm-detail-row"><span className="detail-label">Total</span><span>PKR {savedReservation.totalPrice.toLocaleString()}</span></div>
                  )}
                </div>

                <div className="confirm-reminder-note">
                  <Mail size={16} />
                  <span>
                    Details sent to <strong>{form.email}</strong>.
                    Check inbox (and Spam folder) for updates.
                  </span>
                </div>

                <div className="confirm-actions no-capture">
                  <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSaveToDevice}>
                    <Download size={16} /> {saving ? 'Saving…' : 'Save to Device'}
                  </button>
                  <Link to="/index/my-appointments" className="btn btn-ghost">
                    <CalendarCheck size={16} /> View My Bookings
                  </Link>
                  <Link to="/index/browse?type=beachhuts" className="btn btn-ghost">
                    <Home size={16} /> Browse More
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          {step < 2 && (
            <div className="booking-nav card-body booking-nav-group" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-nav-back"
                onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)}
              >
                <ChevronLeft size={16} /> {step === 0 ? 'Back' : 'Previous'}
              </button>
              {step === 0 ? (
                <button className="btn btn-primary btn-nav-primary" disabled={!canNext()} onClick={() => setStep(1)}>
                  Continue
                </button>
              ) : user ? (
                <button className="btn btn-primary btn-nav-primary" disabled={submitting || !canSubmit()} onClick={handleSubmit}>
                  {submitting ? 'Booking…' : 'Confirm Booking'}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
