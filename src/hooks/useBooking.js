import { useCallback } from 'react';
import {
  runTransaction, doc, collection, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  DAY_KEYS, generateTimeSlots, coveredTimes, slotId, resolveDayBounds,
} from '../utils/slots';
import { bookingRef } from '../utils/format';

/** Thrown when a slot filled up between the customer viewing it and confirming. */
export class SlotUnavailableError extends Error {
  constructor(message = 'That time was just taken. Please pick another slot.') {
    super(message);
    this.name = 'SlotUnavailableError';
  }
}

/**
 * Transactional booking — the integrity core.
 *
 * bookAppointment creates the appointment AND claims every slot the service
 * spans inside a single Firestore transaction. Because concurrent transactions
 * on the same slot doc are serialized by Firestore, two customers can never
 * both claim the last unit of a slot: the loser re-reads, sees it full, and
 * aborts with SlotUnavailableError. Appointment + slot claim commit together,
 * so a failed booking never leaves an orphan appointment.
 */
export function useBooking() {
  // `services` is an array — one appointment can now bundle several bookable
  // services (e.g. "Haircut + Manicure") into one slot-claim, one confirmation.
  const bookAppointment = useCallback(async ({ business, services, dateStr, time, customer }) => {
    const slotDuration  = business.slotDuration || 30;
    const capacity      = business.slotCapacity || 1;
    const totalDuration = services.reduce((sum, s) => sum + (Number(s.duration) || 0), 0);

    // Re-derive the grid + covered slots from working hours (not trusting the UI).
    const [y, mo, d] = dateStr.split('-').map(Number);
    const day    = new Date(y, mo - 1, d);
    const dayKey = DAY_KEYS[day.getDay()];
    const hours  = business.workingHours?.[dayKey];
    if (!hours?.open || !hours?.close) {
      throw new SlotUnavailableError('The business is closed on this day.');
    }
    const grid      = generateTimeSlots(hours.open, hours.close, slotDuration);
    const dayBounds = resolveDayBounds(hours.open, hours.close);
    const covered   = coveredTimes(time, totalDuration, slotDuration, grid, dayBounds);
    if (!covered) {
      throw new SlotUnavailableError('These services don\'t fit in the selected time.');
    }

    // Reject bookings in the past (business-local clock).
    const [h, mi] = time.split(':').map(Number);
    const dt = new Date(y, mo - 1, d, h, mi, 0);
    if (dt.getTime() <= Date.now()) {
      throw new SlotUnavailableError('That time has already passed. Please pick a future slot.');
    }

    const apptRef  = doc(collection(db, 'appointments'));
    const slotIds  = covered.map(t => slotId(dateStr, t));
    const slotRefs = slotIds.map(id => doc(db, 'businesses', business.id, 'slots', id));

    const hasPrice   = services.some(s => s.price != null);
    const totalPrice = hasPrice ? services.reduce((sum, s) => sum + (Number(s.price) || 0), 0) : null;

    await runTransaction(db, async (tx) => {
      // ── all reads first (Firestore requirement) ──
      const snaps = await Promise.all(slotRefs.map(r => tx.get(r)));
      snaps.forEach((s) => {
        const booked = s.exists() ? (s.data().booked || 0) : 0;
        const cap    = s.exists() ? (s.data().capacity || capacity) : capacity;
        if (booked >= cap) throw new SlotUnavailableError();
      });

      // ── then writes ──
      tx.set(apptRef, {
        bookingRef:          bookingRef(apptRef.id),
        businessId:          business.id,
        businessType:        business.type,
        businessName:        business.name,
        businessAddress:     business.address || '',
        // Kept scalar (name joined, price/duration summed) so every existing
        // reader — admin tables, Dashboard, emails, confirmation page — needs
        // no changes at all; `services` carries the itemized breakdown for
        // anything that wants it later.
        serviceId:           services[0]?.id ?? null,
        serviceName:         services.map(s => s.name).join(' + '),
        servicePrice:        totalPrice,
        serviceDuration:     totalDuration,
        services:            services.map(s => ({ id: s.id, name: s.name, duration: s.duration ?? null, price: s.price ?? null })),
        date:                dateStr,
        time,
        appointmentDatetime: Timestamp.fromDate(dt),
        customerName:        customer.name,
        customerPhone:       customer.phone,
        customerEmail:       customer.email.toLowerCase().trim(),
        customerId:          customer.uid || null,
        notes:               customer.notes || '',
        paymentProofUrl:     customer.paymentProofUrl || null,
        isOnline:            customer.isOnline ?? null,
        status:              'pending',
        bookedSlotIds:       slotIds,
        reminders:           { r24: false, r1hr: false, r15min: false },
        fcmToken:            null,
        createdAt:           serverTimestamp(),
      });

      snaps.forEach((s, i) => {
        const prevBooked = s.exists() ? (s.data().booked || 0) : 0;
        const prevIds    = s.exists() ? (s.data().apptIds || []) : [];
        const cap        = s.exists() ? (s.data().capacity || capacity) : capacity;
        tx.set(slotRefs[i], {
          date:      dateStr,
          time:      covered[i],
          capacity:  cap,
          booked:    prevBooked + 1,
          apptIds:   [...prevIds, apptRef.id],
          updatedAt: serverTimestamp(),
        });
      });
    });

    return apptRef.id;
  }, []);

  /**
   * Cancel an appointment and release every slot it held, atomically, so the
   * freed capacity becomes bookable again with no partial/left-over state.
   *
   * `actor` records who initiated the cancellation (customer vs business-side
   * staff) so a later "I didn't cancel this" dispute has a real answer —
   * see cancellation-attribution work, Sep 2026.
   */
  const cancelAppointment = useCallback(async (appt, actor) => {
    const apptRef  = doc(db, 'appointments', appt.id);
    const slotIds  = appt.bookedSlotIds || [];
    const slotRefs = slotIds.map(id => doc(db, 'businesses', appt.businessId, 'slots', id));

    await runTransaction(db, async (tx) => {
      const snaps = await Promise.all(slotRefs.map(r => tx.get(r)));
      tx.update(apptRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
        ...(actor ? {
          cancelledByRole: actor.role,
          cancelledByUid:  actor.uid || null,
          cancelledByName: actor.name || null,
          // Optional free-text/preset reason (CancelReasonDialog) — see
          // firestore.rules' customer-cancel allowlist for the size bound.
          ...(actor.reason ? { cancelReason: actor.reason } : {}),
        } : {}),
      });
      snaps.forEach((s, i) => {
        if (!s.exists()) return;
        const booked = Math.max(0, (s.data().booked || 0) - 1);
        tx.set(slotRefs[i], {
          booked,
          apptIds:   (s.data().apptIds || []).filter(id => id !== appt.id),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
    });
  }, []);

  /**
   * No-show policy, Scenario 1 (deck: "Customer Reserves Only the Table"):
   * the restaurant marks a confirmed booking a no-show past the grace
   * window (gated in the UI — AppointmentsPage.jsx) and the held slot is
   * released, same as a cancellation, so it becomes bookable again. Booking
   * fee "forfeiture" is inherent, not a separate step: advance payment is an
   * off-app bank transfer (BookingPage.jsx), so there's no in-app charge to
   * reverse — marking no_show simply means the business keeps it.
   */
  const markNoShow = useCallback(async (appt) => {
    const apptRef  = doc(db, 'appointments', appt.id);
    const slotIds  = appt.bookedSlotIds || [];
    const slotRefs = slotIds.map(id => doc(db, 'businesses', appt.businessId, 'slots', id));

    await runTransaction(db, async (tx) => {
      const snaps = await Promise.all(slotRefs.map(r => tx.get(r)));
      tx.update(apptRef, { status: 'no_show', updatedAt: serverTimestamp() });
      snaps.forEach((s, i) => {
        if (!s.exists()) return;
        const booked = Math.max(0, (s.data().booked || 0) - 1);
        tx.set(slotRefs[i], {
          booked,
          apptIds:   (s.data().apptIds || []).filter(id => id !== appt.id),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
    });
  }, []);

  return { bookAppointment, cancelAppointment, markNoShow, SlotUnavailableError };
}
