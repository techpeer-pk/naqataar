import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Bike, Banknote, UtensilsCrossed, LogIn, Upload, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidLocalPhoneDigits, toFullPhone, stripCountryCode, PH_LOCAL_PHONE_LEN } from '../../../utils/validation';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../firebase';
import { useCart } from '../../../context/CartContext';
import { useAuth } from '../../../context/AuthContext';
import { useBusinesses } from '../../../hooks/useBusinesses';
import { useAppointments } from '../../../hooks/useAppointments';
import { useBooking } from '../../../hooks/useBooking';
import { useOrderPlacement } from '../../../hooks/useOrderPlacement';
import { useEmailNotifications } from '../../../hooks/useEmailNotifications';
import { orderRef, formatTime12h } from '../../../utils/format';
import EmailTypoHint from '../../../components/shared/EmailTypoHint';
import BankDetailsCard from '../../../components/shared/BankDetailsCard';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const { cart, itemCount, subtotal, clearCart, clearDineIn } = useCart();
  const { user, isCustomer, login, loginWithGoogle } = useAuth();
  const { fetchOne } = useBusinesses();
  const { fetchOne: fetchAppointment } = useAppointments();
  const { cancelAppointment } = useBooking();
  const { placeOrder } = useOrderPlacement();
  const { sendOrderReceived } = useEmailNotifications();
  const navigate = useNavigate();

  const [business, setBusiness]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name:            '',
    phone:           '',
    email:           '',
    deliveryAddress: '',
    notes:           '',
  });
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [isPickup, setIsPickup] = useState(false);

  // F1 dine-in pre-order — set by the booking confirmation page.
  const dineIn = cart.dineIn;

  // F1 dine-in pre-orders (AFO) are always prepaid — the whole point is
  // protecting the restaurant from a no-show, so this doesn't depend on the
  // business's general `requiresAdvancePayment` toggle (that one governs
  // regular delivery/pickup orders and table-booking fees separately).
  const requiresPrepay = !!dineIn || business?.requiresAdvancePayment === true;

  // Advance payment needs an identity to tie the proof to, so it requires
  // sign-in even though normal checkout allows guests — same reasoning as
  // the booking wizard's gate.
  const [loginForm, setLoginForm]     = useState({ email: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const needsAuthGate = requiresPrepay && !(user && isCustomer);

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

  useEffect(() => {
    if (cart.businessId) fetchOne(cart.businessId).then(setBusiness);
  }, [cart.businessId]);

  // The booking already collected the customer's identity — prefill it.
  useEffect(() => {
    if (dineIn) {
      setForm(f => ({
        ...f,
        name:  f.name  || dineIn.customerName  || '',
        // phone: f.phone || dineIn.customerPhone || '',
        phone: f.phone || stripCountryCode(dineIn.customerPhone) || '',
        email: f.email || dineIn.customerEmail || '',
      }));
    }
  }, [dineIn]);

  // Signed-in customers get their identity pre-filled; email locks to the
  // verified account address (same convention as the booking wizard).
  useEffect(() => {
    if (user && isCustomer) {
      setForm(f => ({
        ...f,
        name:  f.name || user.displayName || '',
        email: user.email,
      }));
    }
  }, [user, isCustomer]);

  if (itemCount === 0) {
    navigate('/qunjeeats', { replace: true });
    return null;
  }

  // Switching to delivery only changes how THIS food order is fulfilled — the
  // table reservation itself stays booked (and the slot stays claimed) unless
  // the customer explicitly says to release it too.
  const handleSwitchToDelivery = async () => {
    const alsoCancelTable = window.confirm(
      `Switch this order to delivery?\n\nClick OK to also cancel your table reservation for ${dineIn.date} at ${formatTime12h(dineIn.time)}, or Cancel to keep your table and just change how you get this food.`
    );
    if (alsoCancelTable) {
      try {
        const appt = await fetchAppointment(dineIn.appointmentId);
        if (appt) await cancelAppointment(appt, { role: 'customer', uid: user?.uid, name: user?.displayName });
        toast.success('Table reservation cancelled.');
      } catch {
        toast.error('Could not cancel your table reservation — please cancel it from My Bookings.');
      }
    }
    clearDineIn();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!business) return;
    if (requiresPrepay && !paymentProofFile) return;
    if (!isValidLocalPhoneDigits(form.phone)) {
      toast.error(`Please enter a valid ${PH_LOCAL_PHONE_LEN}-digit phone number.`);
      return;
    }
    setSubmitting(true);
    try {
      let paymentProofUrl = null;
      if (requiresPrepay && paymentProofFile) {
        const fileRef = ref(storage, `payment-proofs/${user.uid}/${Date.now()}_${paymentProofFile.name}`);
        await uploadBytes(fileRef, paymentProofFile);
        paymentProofUrl = await getDownloadURL(fileRef);
      }

      const id = await placeOrder({
        business,
        items: cart.items,
        customer: {
          name:  form.name.trim(),
          // phone: form.phone.trim(),
          phone: toFullPhone(form.phone), // "92XXXXXXXXXX", same as BookingPage
          email: form.email.trim(),
          uid:   user && isCustomer ? user.uid : null,
        },
        deliveryAddress: form.deliveryAddress.trim(),
        notes: form.notes.trim(),
        dineIn: dineIn ? { appointmentId: dineIn.appointmentId, scheduledFor: dineIn.scheduledFor } : null,
        isPickup: !dineIn && isPickup,
        paymentProofUrl,
      });

      const fulfillmentType = dineIn ? 'dine_in' : (isPickup ? 'pickup' : 'delivery');
      const order = {
        id,
        orderRef:        orderRef(id),
        businessName:    business.name,
        businessPhone:   business.phone || '',
        items:           cart.items,
        totalAmount:     subtotal,
        fulfillmentType,
        scheduledDate:   dineIn?.date || null,
        scheduledTime:   dineIn?.time || null,
        deliveryAddress: fulfillmentType === 'delivery' ? form.deliveryAddress.trim() : '',
        customerName:    form.name.trim(),
        customerEmail:   form.email.trim().toLowerCase(),
      };

      await sendOrderReceived(order);
      clearCart();
      navigate('/qunjeeats/confirm', { state: { order } });
    } catch {
      toast.error('Could not place your order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="eats-checkout page">
      <div className="container eats-checkout-container">
        <button type="button" onClick={() => navigate(-1)} className="back-link"><ChevronLeft size={16} /> Back to Cart</button>

        <h1 className="eats-checkout-title">Checkout</h1>
        {dineIn ? (
          <p className="text-muted eats-checkout-biz">
            <UtensilsCrossed size={14} /> Dine-in pre-order at <strong>{cart.businessName}</strong>
            {' — '}{dineIn.date}, {formatTime12h(dineIn.time)}
            {/* Hidden 2026-09-24 — with the fulfillment choice card below also
                hidden, switching left the customer stuck in delivery mode (no
                advance payment, no way back to dine-in):
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: '0.75rem' }}
              onClick={handleSwitchToDelivery}>
              Switch to delivery
            </button> */}
          </p>
        ) : (
          <p className="text-muted eats-checkout-biz">
            {isPickup ? <Store size={14} /> : <Bike size={14} />}
            {isPickup ? ' Self pickup from ' : ' Delivery from '}<strong>{cart.businessName}</strong>
          </p>
        )}

        {/* Fulfillment choice. Delivery/Pickup toggle which THIS order in
            place; "Dine-in — book a table" (hybrid restaurants only) routes
            through the booking wizard instead — the cart survives in
            localStorage and the booking confirmation brings the customer
            straight back here in dine-in mode. */}
        {/* Hidden 2026-09-24 (fulfillment choice card commented out on request):
        {!dineIn && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>How do you want your food?</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className={`btn btn-sm ${!isPickup ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setIsPickup(false)}>
                  <Bike size={14} /> Delivery
                </button>
                {business?.offersPickup !== false && (
                  <button type="button" className={`btn btn-sm ${isPickup ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setIsPickup(true)}>
                    <Store size={14} /> Self Pickup
                  </button>
                )}
                {business?.offersBooking === true && (
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => {
                      toast('Book your table first — your cart is saved.', { icon: '🍽️' });
                      navigate(`/index/booking/${business.id}`);
                    }}>
                    <UtensilsCrossed size={14} /> Dine-in — book a table
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        */}

        {needsAuthGate ? (
          <div className="card eats-checkout-card">
            <div className="card-body booking-auth-gate">
              <div className="auth-gate-icon"><LogIn size={30} /></div>
              <h2 className="step-heading">Sign In to Continue</h2>
              <p className="auth-gate-sub">
                {dineIn
                  ? 'Pre-ordering ahead of your table booking requires proof of payment — sign in so it can be tied to your account.'
                  : `${business.name} requires proof of advance payment for orders — sign in so it can be tied to your account.`}
              </p>

              <button className="btn btn-ghost btn-full google-btn" onClick={handleGoogleSignIn} disabled={loginLoading}>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} />
                Continue with Google
              </button>

              <div className="auth-divider"><span>or</span></div>

              <form onSubmit={handleEmailSignIn}>
                <div className="form-group">
                  <input className="form-control" type="email" placeholder="Email address"
                    value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <input className="form-control" type="password" placeholder="Password"
                    value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
                <button className="btn btn-primary btn-full" type="submit" disabled={loginLoading}>
                  {loginLoading ? 'Signing in…' : 'Sign In & Continue'}
                </button>
              </form>

              <p className="auth-gate-footer">
                New here? <Link to="/index/register">Create a free account</Link>
              </p>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="card eats-checkout-card">
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-control" required placeholder="Your name"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                {/*
                  <input className="form-control" type="tel" required placeholder="03XX-XXXXXXX"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                */}
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
                <label className="form-label">Email</label>
                <input className="form-control" type="email" required placeholder="you@example.com"
                  value={form.email} readOnly={!!(user && isCustomer)}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                {!(user && isCustomer) && (
                  <EmailTypoHint email={form.email} onFix={email => setForm(f => ({ ...f, email }))} />
                )}
              </div>
              {!dineIn && !isPickup && (
                <div className="form-group">
                  <label className="form-label">Delivery Address</label>
                  <textarea className="form-control" required rows={3}
                    placeholder="Full home/office address — street, block, landmark…"
                    value={form.deliveryAddress}
                    onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-control" placeholder="Less spicy, extra sauce… etc."
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {requiresPrepay && (
                <div className="payment-proof-block">
                  <h3 className="payment-proof-title">
                    {dineIn ? 'Advance Food Order — Payment Required' : 'Advance Payment Required'}
                  </h3>
                  {dineIn && (
                    <p className="form-hint">
                      Pre-ordered food is prepared ahead of your arrival, so it must be paid upfront.
                    </p>
                  )}
                  <p className="payment-proof-amount">PKR {subtotal.toLocaleString()} — transfer to:</p>
                  {/* Per-business bank details hibernated (2026-09-11) — advance
                  payments now go to Qunjee's own account (BankDetailsCard) instead
                  of each business's own bankName/accountTitle/accountNumber.
                  <div className="bank-details-card">
                    <div><span>Bank</span><strong>{business?.bankName || '—'}</strong></div>
                    <div><span>Account Title</span><strong>{business?.accountTitle || '—'}</strong></div>
                    <div><span>Account Number</span><strong>{business?.accountNumber || '—'}</strong></div>
                  </div>
                  */}
                  <BankDetailsCard />
                  <div className="form-group">
                    <label className="form-label">Upload Payment Screenshot *</label>
                    <label className="proof-upload-input">
                      <Upload size={16} />
                      <span className="proof-upload-input-label">
                        {paymentProofFile ? paymentProofFile.name : 'Choose screenshot…'}
                      </span>
                      <input type="file" accept="image/*" hidden
                        onChange={e => setPaymentProofFile(e.target.files?.[0] || null)} />
                    </label>
                    <p className="form-hint">The business will verify this before confirming your order.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card eats-checkout-summary">
            <div className="card-body">
              {cart.items.map(i => (
                <div key={i.menuItemId} className="eats-checkout-line">
                  <span>{i.name} × {i.quantity}</span>
                  <span>{i.price != null ? `PKR ${(i.price * i.quantity).toLocaleString()}` : '—'}</span>
                </div>
              ))}
              <div className="eats-checkout-line eats-checkout-total">
                <span>Total</span>
                <strong>PKR {subtotal.toLocaleString()}</strong>
              </div>
              <p className="eats-checkout-cod">
                <Banknote size={14} />
                {' '}{requiresPrepay
                  ? 'Prepaid — bank transfer'
                  : (isPickup ? 'Pay on Pickup' : 'Cash on Delivery')}
              </p>
              <button className="btn btn-primary btn-full" type="submit"
                disabled={submitting || !business || (requiresPrepay && !paymentProofFile)}>
                {submitting ? 'Placing order…' : 'Place Order'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
