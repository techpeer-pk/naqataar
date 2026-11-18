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
import '../public/HotelBookingPage.css';

// Deliberate fork of HotelBookingPage.jsx rather than a shared/parameterized
// component — the underlying transaction (useRoomBooking, date-range
// capacity claims) is identical, but every user-facing label differs
// (Pickup/Return instead of Check-in/Check-out, no Guests field, "Rental"
// instead of "Room"). Forking means zero chance of an attire-rental wording
// change ever touching the live hotel-booking flow, or vice versa.
const STEPS = ['Dates & Outfit', 'Your Details', 'Rented!'];

export default function NayasaaBookingPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectOutfitId = searchParams.get('outfit');
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
  const [outfit, setOutfit]         = useState(null);
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [quantity, setQuantity]     = useState(1);
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

  // Preselect whichever outfit the customer already picked before landing
  // here, or the only choice if there's just one — same pattern as
  // HotelBookingPage's room-type preselect.
  useEffect(() => {
    if (outfit || services.length === 0) return;
    const linked = preselectOutfitId && services.find(s => s.id === preselectOutfitId);
    if (linked) setOutfit(linked);
    else if (services.length === 1) setOutfit(services[0]);
  }, [services, preselectOutfitId]);

  const days       = pickupDate && returnDate ? nightsBetween(pickupDate, returnDate) : [];
  const dayCount    = days.length;
  const dailyPrice  = outfit ? (outfit.price ?? null) : (business?.pricePerNight ?? null);
  const totalPrice  = dailyPrice != null && dayCount > 0
    ? dailyPrice * dayCount * quantity
    : null;
  const maxUnits    = outfit ? (outfit.totalRooms || 1) : (business?.totalRooms || 1);

  const canNext = () => {
    if (step === 0) return (services.length === 0 || !!outfit) && !!pickupDate && !!returnDate && dayCount > 0 && quantity >= 1;
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
        roomType: outfit,
        checkIn:  pickupDate,
        checkOut: returnDate,
        rooms:    quantity,
        guests:   1,   // not a meaningful concept for attire rental — fixed, never shown to the customer
        customer: {
          name:  form.name,
          // phone: form.phone,
          phone: toFullPhone(form.phone), // "92XXXXXXXXXX", same as BookingPage
          email: bookingEmail,
          notes: form.notes,
          uid:   user?.uid || null,
        },
      });
      setSavedReservation({ id, roomTypeName: outfit?.name ?? null, checkIn: pickupDate, checkOut: returnDate, nights: dayCount, rooms: quantity, totalPrice, requestedAt: new Date().toISOString() });

      await sendReservationReceived({
        reservationRef:  reservationRef(id),
        businessType:    business.type,
        businessName:    business.name,
        businessAddress: business.address || '',
        checkIn: pickupDate, checkOut: returnDate,
        nights:          dayCount,
        roomsRequested:  quantity,
        guestCount:      1,
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

  // One-tap proof-of-booking image — same pattern as HotelBookingPage.
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
      link.download = `rental-${reservationRef(savedReservation.id)}.png`;
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
    <div className="booking-page nayasaa-booking-page page">
      <div className="container booking-container">
        <h1 className="booking-title">Rent an Outfit at {business.name}</h1>

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

            {/* Step 0 — Outfit (only when this shop has outfit docs), then Dates & Quantity */}
            {step === 0 && (
              <div className="fade-up">
                {services.length > 0 && (
                  <div className="form-group">
                    <h2 className="step-heading">Outfit</h2>
                    <div className="service-select-list">
                      {services.map(s => {
                        const checked = outfit?.id === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`service-select-item ${checked ? 'selected' : ''}`}
                            onClick={() => setOutfit(s)}
                          >
                            <span className={`service-select-check ${checked ? 'checked' : ''}`}>
                              {checked && <Check size={13} />}
                            </span>
                            {s.image && <img src={s.image} alt={s.name} className="service-select-thumb" />}
                            <div className="service-select-info">
                              <span className="service-select-name">
                                {s.name} {s.onTop && <span className="badge badge-promo">Promo</span>}
                              </span>
                              {s.description && <span className="service-select-desc">{s.description}</span>}
                            </div>
                            <div className="service-select-meta">
                              <span>{s.totalRooms || 1} available</span>
                              {s.price && <span className="service-select-price">PKR {s.price.toLocaleString()} / day</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {!outfit && services.length > 1 && (
                      <p className="service-select-hint">Pick an outfit above to continue.</p>
                    )}
                  </div>
                )}

                <h2 className="step-heading">Choose Rental Dates &amp; Quantity</h2>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Pickup Date</label>
                    <input className="form-control" type="date" min={todayStr}
                      value={pickupDate}
                      onChange={e => {
                        const v = e.target.value;
                        setPickupDate(v);
                        if (returnDate && returnDate <= v) setReturnDate('');
                      }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Return Date</label>
                    <input className="form-control" type="date"
                      min={pickupDate ? toDateStr(addDays(parseDateStr(pickupDate), 1)) : todayStr}
                      value={returnDate} disabled={!pickupDate}
                      onChange={e => setReturnDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <div className="room-stepper">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={quantity <= 1}
                      onClick={() => setQuantity(r => Math.max(1, r - 1))}>
                      <Minus size={14} />
                    </button>
                    <span className="room-stepper-count">{quantity}</span>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={quantity >= maxUnits}
                      onClick={() => setQuantity(r => Math.min(maxUnits, r + 1))}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="form-hint">Up to {maxUnits} available in this design.</p>
                </div>

                {dayCount > 0 && (
                  <p className="service-select-total">
                    {dayCount} day{dayCount > 1 ? 's' : ''} × {quantity} unit{quantity > 1 ? 's' : ''}
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
                      <textarea className="form-control" placeholder="Size, delivery address, alteration notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    <h2 className="section-heading section-heading-divided">Confirm Rental</h2>
                    <div className="confirm-summary">
                      {[
                        { label: 'Business',    value: business.name },
                        ...(outfit ? [{ label: 'Outfit', value: outfit.name }] : []),
                        { label: 'Pickup',      value: format(parseDateStr(pickupDate), 'EEEE, d MMMM yyyy') },
                        { label: 'Return',      value: format(parseDateStr(returnDate), 'EEEE, d MMMM yyyy') },
                        { label: 'Quantity',    value: `${quantity} unit${quantity > 1 ? 's' : ''} — ${dayCount} day${dayCount > 1 ? 's' : ''}${totalPrice != null ? ` — PKR ${totalPrice.toLocaleString()}` : ''}` },
                        ...(form.notes ? [{ label: 'Notes', value: form.notes }] : []),
                      ].map(row => (
                        <div key={row.label} className="confirm-row">
                          <span className="confirm-label">{row.label}</span>
                          <span className="confirm-value">{row.value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Wording changed (2026-09-11) — see
                    project_platform_liability_no_confirm_language memory:
                    real confirmation only happens once the business accepts.
                    <p className="confirm-note">
                      A confirmation will be sent to <strong>{form.email}</strong>.
                    </p>
                    */}
                    <p className="confirm-note">
                      A receipt will be sent to <strong>{form.email}</strong>. Please check your Spam folder if it doesn't arrive.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Step 2 — Rented! */}
            {step === 2 && savedReservation && (
              <div className="fade-up text-center">
                <div className="confirm-icon"><CheckCircle size={52} /></div>
                <h2 className="confirm-title">Rental Booked!</h2>
                <p className="confirm-sub">Your rental request has been placed successfully.</p>

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
                    <div className="confirm-detail-row"><span className="detail-label">Outfit</span><span>{savedReservation.roomTypeName}</span></div>
                  )}
                  <div className="confirm-detail-row"><span className="detail-label">Pickup</span><span>{savedReservation.checkIn}</span></div>
                  <div className="confirm-detail-row"><span className="detail-label">Return</span><span>{savedReservation.checkOut}</span></div>
                  <div className="confirm-detail-row"><span className="detail-label">Quantity</span><span>{savedReservation.rooms} unit{savedReservation.rooms > 1 ? 's' : ''} — {savedReservation.nights} day{savedReservation.nights > 1 ? 's' : ''}</span></div>
                  {savedReservation.totalPrice != null && (
                    <div className="confirm-detail-row"><span className="detail-label">Total</span><span>PKR {savedReservation.totalPrice.toLocaleString()}</span></div>
                  )}
                </div>

                {/* Wording changed (2026-09-11) — see
                project_platform_liability_no_confirm_language memory:
                <div className="confirm-reminder-note">
                  <Mail size={16} />
                  <span>
                    Confirmation sent to <strong>{form.email}</strong>.
                    Check inbox for details.
                  </span>
                </div>
                */}
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
                  <Link to="/nayasaa" className="btn btn-ghost">
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
                  {submitting ? 'Booking…' : 'Confirm Rental'}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
