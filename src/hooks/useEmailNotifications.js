import emailjs from '@emailjs/browser';
import { format } from 'date-fns';
import { formatTime12h, orderRef } from '../utils/format';

const PUBLIC_KEY         = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const SERVICE_ID         = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_BOOKING   = import.meta.env.VITE_EMAILJS_BOOKING_TEMPLATE;
const TEMPLATE_CONFIRMED = import.meta.env.VITE_EMAILJS_CONFIRMED_TEMPLATE;
const TEMPLATE_CANCELLED = import.meta.env.VITE_EMAILJS_CANCELLED_TEMPLATE;
const TEMPLATE_ORDER           = import.meta.env.VITE_EMAILJS_ORDER_TEMPLATE;
const TEMPLATE_ORDER_STATUS    = import.meta.env.VITE_EMAILJS_ORDER_STATUS_TEMPLATE;
const TEMPLATE_ORDER_CANCELLED = import.meta.env.VITE_EMAILJS_ORDER_CANCELLED_TEMPLATE;
const TEMPLATE_INVOICE         = import.meta.env.VITE_EMAILJS_INVOICE_TEMPLATE;
// Hibernated (2026-09-11) — a dedicated pre-order template was tried and
// reverted same day: EmailJS's free plan only allows 2 templates, can't
// afford a new one. The pfo_url line is folded into sendAdminConfirmed's
// `details` string instead (built conditionally in JS), reusing
// TEMPLATE_CONFIRMED — no new template needed. Kept here in case a paid
// plan ever makes a dedicated template worth it again.
// const TEMPLATE_PREORDER = import.meta.env.VITE_EMAILJS_PREORDER_TEMPLATE;

/** "Chicken Biryani x2, Raita x1" — one line the email template can drop in as-is. */
function itemsSummary(items = []) {
  return items.map(i => `${i.name} x${i.quantity}`).join(', ');
}

// One label per business type, dropped into the generic booking/confirmed
// templates as {{booking_type}} — so the same two EmailJS templates read
// naturally for a table, an appointment, or a room, with no per-type
// template ever needed (see TYPE_BOOK_CTA in BusinessPage.jsx for the same
// mapping used on-screen).
const TYPE_LABELS = { restaurant: 'Table Reservation', hotel: 'Room Booking', nayasaa: 'Outfit Rental', beachhuts: 'Beach Hut Booking' };
const typeLabel = (type) => TYPE_LABELS[type] || 'Appointment';

export function useEmailNotifications() {
  const send = async (templateId, params) => {
    if (!PUBLIC_KEY || !SERVICE_ID || !templateId) return;
    try {
      await emailjs.send(SERVICE_ID, templateId, params, PUBLIC_KEY);
    } catch {
      // Email failure is non-critical — booking is already saved in Firestore
    }
  };

  /**
   * Generic "we received your booking" email — ONE template shared by every
   * business type and booking shape (slot-based appointments, date-range
   * hotel reservations, and whatever comes next). Callers only ever hand it
   * six type-agnostic fields; all the type-specific formatting (a service +
   * time vs. a room count + date range) happens in the small wrapper below,
   * not in the template. Onboarding a new business type never needs a new
   * EmailJS template — just a new wrapper that fills in `when`/`details`.
   */
  const sendPending = ({ bookingRef, customerName, customerEmail, businessType, businessName, businessAddress, when, details }) =>
    send(TEMPLATE_BOOKING, {
      booking_ref:   bookingRef || '',
      to_name:       customerName,
      to_email:      customerEmail,
      business_name: businessName,
      booking_type:  typeLabel(businessType),
      when,
      details,
      address:       businessAddress || '',
    });

  /** Same generic-template idea, for the "business confirmed it" email. */
  const sendConfirmed = ({ bookingRef, customerName, customerEmail, businessType, businessName, when, details }) =>
    send(TEMPLATE_CONFIRMED, {
      booking_ref:   bookingRef || '',
      to_name:       customerName,
      to_email:      customerEmail,
      business_name: businessName,
      booking_type:  typeLabel(businessType),
      when,
      details,
    });

  // Renamed 2026-09-11 (was sendBookingConfirmation) — fires right at booking
  // creation while status is still 'pending' (see useBooking.js), so
  // "Confirmation" was the wrong word: Qunjee is a platform over independent
  // business partners, and only the business's own "Confirm" action
  // (AppointmentsPage.jsx → sendAdminConfirmed) actually confirms anything.
  // A Qunjee-generated artifact that says "confirmed" before that is a
  // liability risk if the business doesn't follow through.
  const sendBookingReceived = (a) =>
    sendPending({
      bookingRef:      a.bookingRef,
      customerName:    a.customerName,
      customerEmail:   a.customerEmail,
      businessType:    a.businessType,
      businessName:    a.businessName,
      businessAddress: a.businessAddress,
      when:            `${a.date} at ${formatTime12h(a.time)}`,
      details:         a.serviceName,
    });

  // `pfoUrl` (2026-09-11) — F1 dine-in pre-order link, only passed for
  // hybrid restaurants (business.offersOrdering === true). Folded into
  // `details` here in JS, not a separate {{pfo_url}} template variable —
  // EmailJS's free plan only allows 2 templates, and this reuses
  // TEMPLATE_CONFIRMED (shared by every business type) instead of needing a
  // dedicated one. When pfoUrl is null, `details` is byte-for-byte what it
  // was before — salon/clinic/hotel/nayasaa confirmations are unaffected.
  const sendAdminConfirmed = (a, pfoUrl = null) =>
    sendConfirmed({
      bookingRef:    a.bookingRef,
      customerName:  a.customerName,
      customerEmail: a.customerEmail,
      businessType:  a.businessType,
      businessName:  a.businessName,
      when:          `${a.date} at ${formatTime12h(a.time)}`,
      details:       pfoUrl
        ? `${a.serviceName}\n\nWant your food ready when you arrive? Pre-order here: ${pfoUrl}`
        : a.serviceName,
    });

  const sendCancellation = (a, reason = '') =>
    send(TEMPLATE_CANCELLED, {
      to_name:       a.customerName,
      to_email:      a.customerEmail,
      business_name: a.businessName,
      service_name:  a.serviceName,
      date:          a.date,
      reason,
    });

  // ── Hotel/Nayasaa room-pool reservations — same two generic templates as
  // above, just a different `when`/`details` shape (date range + unit count
  // instead of a service + time slot). No dedicated hotel/nayasaa EmailJS
  // template. Nayasaa reuses this same room-pool engine for outfit rentals,
  // so "room"/"night" is swapped for "unit"/"day" when businessType is
  // 'nayasaa' — same wording NayasaaBookingPage itself already uses. ──

  // Renamed 2026-09-11 (was sendReservationConfirmation) — same reasoning as
  // sendBookingReceived above: fires at creation time (status 'pending'),
  // real confirmation only happens via sendReservationConfirmed.
  const sendReservationReceived = (r) => {
    const isNayasaa = r.businessType === 'nayasaa';
    const unitWord   = isNayasaa ? 'unit' : r.businessType === 'beachhuts' ? 'hut' : 'room';
    // const periodWord = isNayasaa ? 'day'  : 'night';
    // Beach Huts priced per day, not per night (2026-09-24)
    const periodWord = isNayasaa || r.businessType === 'beachhuts' ? 'day' : 'night';
    return sendPending({
      bookingRef:      r.reservationRef,
      customerName:    r.customerName,
      customerEmail:   r.customerEmail,
      businessType:    r.businessType || 'hotel',
      businessName:    r.businessName,
      businessAddress: r.businessAddress,
      when:            `${r.checkIn} → ${r.checkOut} (${r.nights} ${periodWord}${r.nights > 1 ? 's' : ''})`,
      details:         `${r.roomsRequested} ${unitWord}${r.roomsRequested > 1 ? 's' : ''}` + (r.guestCount ? `, ${r.guestCount} guest${r.guestCount > 1 ? 's' : ''}` : '') + (r.totalPrice != null ? ` — PKR ${r.totalPrice.toLocaleString()}` : ''),
    });
  };

  const sendReservationConfirmed = (r) => {
    const isNayasaa = r.businessType === 'nayasaa';
    const unitWord   = isNayasaa ? 'unit' : r.businessType === 'beachhuts' ? 'hut' : 'room';
    // const periodWord = isNayasaa ? 'day'  : 'night';
    // Beach Huts priced per day, not per night (2026-09-24)
    const periodWord = isNayasaa || r.businessType === 'beachhuts' ? 'day' : 'night';
    return sendConfirmed({
      bookingRef:    r.reservationRef,
      customerName:  r.customerName,
      customerEmail: r.customerEmail,
      businessType:  r.businessType || 'hotel',
      businessName:  r.businessName,
      when:          `${r.checkIn} → ${r.checkOut} (${r.nights} ${periodWord}${r.nights > 1 ? 's' : ''})`,
      details:       `${r.roomsRequested} ${unitWord}${r.roomsRequested > 1 ? 's' : ''}` + (r.guestCount ? `, ${r.guestCount} guest${r.guestCount > 1 ? 's' : ''}` : ''),
    });
  };

  // ── Qunjee Eats orders — same swallow-on-failure convention: the order is
  // already saved in Firestore, email is best-effort on top. ──

  // Renamed 2026-09-11 (was sendOrderConfirmation) — same reasoning as
  // sendBookingReceived above: fires at order-creation time (status
  // 'pending'), the business's own status change later sends
  // sendOrderStatusUpdate.
  const sendOrderReceived = (o) =>
    send(TEMPLATE_ORDER, {
      order_ref:        o.orderRef || orderRef(o.id),
      to_name:          o.customerName,
      to_email:         o.customerEmail,
      business_name:    o.businessName,
      items:            itemsSummary(o.items),
      total:            o.totalAmount,
      delivery_address: o.deliveryAddress || '',
    });

  const sendOrderStatusUpdate = (o, status) =>
    send(TEMPLATE_ORDER_STATUS, {
      order_ref:     o.orderRef || orderRef(o.id),
      to_name:       o.customerName,
      to_email:      o.customerEmail,
      business_name: o.businessName,
      status,
    });

  const sendOrderCancellation = (o, reason = '') =>
    send(TEMPLATE_ORDER_CANCELLED, {
      order_ref:     o.orderRef || orderRef(o.id),
      to_name:       o.customerName,
      to_email:      o.customerEmail,
      business_name: o.businessName,
      items:         itemsSummary(o.items),
      reason,
    });

  // ── Subscription invoices — see docs/Billing-Subscription.md. Same
  // swallow-on-failure convention: the invoice record is already saved in
  // Firestore before this is called, email is best-effort on top. No-ops
  // until VITE_EMAILJS_INVOICE_TEMPLATE is set (create the template in the
  // EmailJS dashboard first, same as the other templates). ──
  const sendInvoice = (inv) =>
    send(TEMPLATE_INVOICE, {
      invoice_ref:    inv.invoiceRef,
      to_name:        inv.businessName,
      to_email:       inv.businessEmail,
      amount:         inv.amount,
      period_start:   inv.periodStart ? format(inv.periodStart, 'd MMM yyyy') : '',
      period_end:     format(inv.periodEnd, 'd MMM yyyy'),
    });

  return {
    sendBookingReceived, sendAdminConfirmed, sendCancellation,
    sendReservationReceived, sendReservationConfirmed,
    sendOrderReceived, sendOrderStatusUpdate, sendOrderCancellation,
    sendInvoice,
  };
}
