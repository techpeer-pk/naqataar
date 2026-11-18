import { useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { CheckCircle, CalendarCheck, Mail, Home, UtensilsCrossed, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { bookingRef, formatTime12h } from '../../utils/format';
import './ConfirmationPage.css';
import { t } from '../../i18n';

export default function ConfirmationPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { startDineInOrder, cart, itemCount } = useCart();
  const { appointment, appointmentDatetime, offersOrdering } = state || {};
  const ref = appointment?.bookingRef || bookingRef(appointment?.id);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);

  // Same one-tap proof-of-booking image as HotelBookingPage/NayasaaBookingPage
  // — no print dialog, works the same on desktop and mobile. The action
  // buttons are excluded from the capture via the `no-capture` class.
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
      link.download = `booking-${ref}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error(t('Could not save image. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  // Customer came from the Eats checkout's Delivery/Dine-in choice: their
  // cart is already filled for this restaurant, so send them straight back
  // to checkout instead of the menu.
  const resumeCheckout = itemCount > 0 && cart.businessId === appointment?.businessId;

  // F1 dine-in pre-order: hybrid restaurants let the customer order their
  // food now so it's ready at their booked time.
  const handlePreOrder = () => {
    startDineInOrder(
      { id: appointment.businessId, name: appointment.businessName },
      {
        appointmentId: appointment.id,
        scheduledFor:  appointmentDatetime || null,
        date:          appointment.date,
        time:          appointment.time,
        customerName:  appointment.customerName,
        customerPhone: appointment.customerPhone,
        customerEmail: appointment.customerEmail,
      }
    );
    // Was `/qunjeeats/business/${appointment.businessId}` — that page's Menu
    // is hibernated (2026-09-11, general Eats browsing on hold). /pfo is the
    // dedicated dine-in pre-order page instead, see PreFoodOrderPage.jsx.
    navigate(resumeCheckout ? '/qunjeeats/checkout' : `/pfo/${appointment.businessId}?appt=${appointment.id}`);
  };

  return (
    <div className="confirm-page page">
      <div className="container confirm-container">
        <div className="confirm-box card fade-up" ref={cardRef}>
          <div className="card-body text-center">
            <div className="confirm-icon">
              <CheckCircle size={52} />
            </div>
            {/* Copy changed (2026-09-11) — appointment is created with status:
            'pending' (see useBooking.js) until the business explicitly hits
            "Confirm" in AppointmentsPage.jsx, so "Booking Confirmed!" here
            overstated it. Old copy kept commented for rollback:
            <h1 className="confirm-title">Booking Confirmed!</h1>
            <p className="confirm-sub">
              Your appointment has been placed successfully.<br />
              We'll notify you with reminders before it's time.
            </p>
            */}
            <h1 className="confirm-title">{t('Booking Received')}</h1>
            <p className="confirm-sub">
              {t('Your request has been sent to')} <strong>{appointment?.businessName}</strong> {t('for confirmation.')}<br />
              {t('Please check your email (including Spam folder).')}
            </p>

            {ref && (
              <div className="confirm-ref">
                <span className="confirm-ref-label">{t('Booking ID')}</span>
                <span className="confirm-ref-code">{ref}</span>
              </div>
            )}

            {appointment && (
              <div className="confirm-details">
                {appointment.requestedAt && (
                  <div className="confirm-detail-row">
                    <span className="detail-label">{t('Requested')}</span>
                    <span>{new Date(appointment.requestedAt).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                <div className="confirm-detail-row">
                  <span className="detail-label">{t('Clinic')}</span>
                  <span>{appointment.businessName}</span>
                </div>
                <div className="confirm-detail-row">
                  <span className="detail-label">{t('Service')}</span>
                  <span>{appointment.serviceName}</span>
                </div>
                <div className="confirm-detail-row">
                  <span className="detail-label">{t('Date')}</span>
                  <span>{appointment.date}</span>
                </div>
                <div className="confirm-detail-row">
                  <span className="detail-label">{t('Time')}</span>
                  <span>{formatTime12h(appointment.time)}</span>
                </div>
                <div className="confirm-detail-row">
                  <span className="detail-label">{t('Name')}</span>
                  <span>{appointment.customerName}</span>
                </div>
                {appointment.servicePrice != null && (
                  <div className="confirm-detail-row">
                    <span className="detail-label">{t('Total')}</span>
                    <span>PKR {Number(appointment.servicePrice).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* Wording changed (2026-09-11) — "Confirmation" implies the
            business already confirmed it; that only happens later via
            AppointmentsPage.jsx's "Confirm" action. Old copy kept for rollback:
            <div className="confirm-reminder-note">
              <Mail size={16} />
              <span>
                Confirmation sent to <strong>{appointment?.customerEmail}</strong>.
                Check inbox for details + reminders.
              </span>
            </div>
            */}
            <div className="confirm-reminder-note">
              <Mail size={16} />
              <span>
                {t('Details sent to')} <strong>{appointment?.customerEmail}</strong>.{' '}
                {t('Check inbox (and Spam folder) for updates + reminders.')}
              </span>
            </div>

            <div className="confirm-reminder-note confirm-reminder-note--info">
              <CalendarCheck size={16} />
              <span>
                {t("We'll remind you 24 hours, 1 hour and 15 minutes before your appointment.")}
              </span>
            </div>

            {/* Hibernated (2026-09-11) — no pre-order prompt while the
            appointment is still 'pending'. The business hasn't confirmed the
            table yet at this point (see project_platform_liability_no_confirm_language
            memory); offering food pre-order here implied the table was a done
            deal before the business ever said so.
            {offersOrdering && appointment && (
              <div className="confirm-reminder-note confirm-reminder-note--info">
                <UtensilsCrossed size={16} />
                <span>
                  {resumeCheckout
                    ? <>Your cart is waiting — <strong>finish your food order</strong> for this booking.</>
                    : <>Arriving hungry? <strong>Pre-order your food</strong> so it's ready when you get there.</>}
                </span>
              </div>
            )}
            */}

            <div className="confirm-actions no-capture">
              {appointment && (
                <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSaveToDevice}>
                  <Download size={16} /> {saving ? t('Saving…') : t('Save to Device')}
                </button>
              )}
              {/* Hibernated (2026-09-11) — same reasoning as the note above.
              {offersOrdering && appointment && (
                <button className="btn btn-ghost" onClick={handlePreOrder}>
                  <UtensilsCrossed size={16} /> {resumeCheckout ? 'Continue to Checkout' : 'Pre-order Food'}
                </button>
              )}
              */}
              <Link to="/index/my-appointments" className="btn btn-ghost">
                <CalendarCheck size={16} /> {t('View My Bookings')}
              </Link>
              <Link to="/" className="btn btn-ghost">
                <Home size={16} /> {t('Find another clinic')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
