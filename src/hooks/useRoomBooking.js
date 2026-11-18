import { useCallback } from 'react';
import {
  runTransaction, doc, collection, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { nightsBetween, parseDateStr } from '../utils/nights';
import { reservationRef } from '../utils/format';

/** Thrown when a room filled up between the guest viewing it and confirming. */
export class RoomUnavailableError extends Error {
  constructor(message = 'That date range just filled up. Please try different dates.') {
    super(message);
    this.name = 'RoomUnavailableError';
  }
}

/**
 * Transactional room booking — the hotel-booking counterpart to useBooking.
 * Claims every calendar night the stay spans in one Firestore transaction,
 * same integrity guarantee as slot claims: concurrent transactions on the
 * same night doc are serialized, so two guests can never both claim the last
 * room. A room claim can move capacity by more than 1 (roomsRequested), so
 * the check is a bound (booked + roomsRequested <= capacity), not "is it
 * exactly full".
 */
export function useRoomBooking() {
  const bookReservation = useCallback(async ({ business, roomType, checkIn, checkOut, rooms, guests, customer }) => {
    const roomsRequested = Number(rooms) || 1;
    const guestCount = Number(guests) || 1;

    const nights = nightsBetween(checkIn, checkOut);
    if (nights.length === 0) {
      throw new RoomUnavailableError('Check-out must be after check-in.');
    }

    // Reject a check-in date already in the past — compared day-to-day, not
    // by clock time, so same-day check-in still works (unlike a time-slot
    // booking, a check-in date has no time-of-day component to compare).
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parseDateStr(checkIn) < today) {
      throw new RoomUnavailableError('That check-in date has already passed. Please pick a future date.');
    }

    const resvRef = doc(collection(db, 'reservations'));
    const bizRef  = doc(db, 'businesses', business.id);
    // A hotel with room types keeps a separate inventory pool per type
    // (businesses/{id}/services/{roomType.id}/roomNights) — never the shared
    // business-level pool, otherwise the two pools could double-book the same
    // physical rooms. Hotels with no room-type docs at all keep using the
    // business-level pool exactly as before.
    const svcRef    = roomType ? doc(db, 'businesses', business.id, 'services', roomType.id) : null;
    const nightRefs = nights.map(n => roomType
      ? doc(db, 'businesses', business.id, 'services', roomType.id, 'roomNights', n)
      : doc(db, 'businesses', business.id, 'roomNights', n));

    await runTransaction(db, async (tx) => {
      // ── all reads first (Firestore requirement) ──
      // Re-read totalRooms/pricePerNight fresh from the business (or room
      // type) doc INSIDE the transaction, instead of trusting the (possibly
      // stale) object the caller passed in or a "sticky" capacity frozen on a
      // night-doc from whenever it was first created. Otherwise an owner
      // raising or lowering Total Rooms after the first booking for a given
      // date never takes effect for that date — the exact overbooking bug
      // this replaced.
      const bizSnap = await tx.get(bizRef);
      const svcSnap = svcRef ? await tx.get(svcRef) : null;
      const capacity = svcSnap
        ? (svcSnap.exists() && svcSnap.data().totalRooms) || 1
        : (bizSnap.exists() && bizSnap.data().totalRooms) || 1;
      const pricePerNight = svcSnap
        ? (svcSnap.exists() ? (svcSnap.data().price ?? null) : null)
        : (bizSnap.exists() ? (bizSnap.data().pricePerNight ?? null) : null);

      const snaps = await Promise.all(nightRefs.map(r => tx.get(r)));
      snaps.forEach((s) => {
        const booked = s.exists() ? (s.data().booked || 0) : 0;
        if (booked + roomsRequested > capacity) throw new RoomUnavailableError();
      });

      // ── then writes ──
      const totalPrice = pricePerNight != null ? pricePerNight * nights.length * roomsRequested : null;

      tx.set(resvRef, {
        reservationRef:   reservationRef(resvRef.id),
        businessId:        business.id,
        businessType:      business.type,
        businessName:       business.name,
        businessAddress:    business.address || '',
        serviceId:          roomType?.id ?? null,
        roomTypeName:       roomType?.name ?? null,
        checkIn,
        checkOut,
        nights:             nights.length,
        roomsRequested,
        guestCount,
        pricePerNight,
        totalPrice,
        customerName:       customer.name,
        customerPhone:      customer.phone,
        customerEmail:      customer.email.toLowerCase().trim(),
        customerId:         customer.uid || null,
        notes:              customer.notes || '',
        status:             'pending',
        bookedNightIds:     nights,
        createdAt:          serverTimestamp(),
      });

      snaps.forEach((s, i) => {
        const prevBooked = s.exists() ? (s.data().booked || 0) : 0;
        const prevIds    = s.exists() ? (s.data().reservationIds || []) : [];
        tx.set(nightRefs[i], {
          date:      nights[i],
          capacity,
          booked:    prevBooked + roomsRequested,
          reservationIds: [...prevIds, resvRef.id],
          updatedAt: serverTimestamp(),
        });
      });
    });

    return resvRef.id;
  }, []);

  /**
   * Cancel a reservation and release every night it held, atomically, so the
   * freed capacity becomes bookable again with no partial/left-over state.
   *
   * `actor` records who initiated the cancellation (customer vs business-side
   * staff) so a later "I didn't cancel this" dispute has a real answer —
   * see cancellation-attribution work, Sep 2026.
   */
  const cancelReservation = useCallback(async (reservation, actor) => {
    const resvRef   = doc(db, 'reservations', reservation.id);
    const nights    = reservation.bookedNightIds || [];
    // Self-describing: the reservation itself says which pool it came from
    // (serviceId set = per-room-type pool, unset = legacy business-level
    // pool), so cancellation never has to guess.
    const nightRefs = nights.map(n => reservation.serviceId
      ? doc(db, 'businesses', reservation.businessId, 'services', reservation.serviceId, 'roomNights', n)
      : doc(db, 'businesses', reservation.businessId, 'roomNights', n));
    const roomsRequested = reservation.roomsRequested || 1;

    await runTransaction(db, async (tx) => {
      const snaps = await Promise.all(nightRefs.map(r => tx.get(r)));
      tx.update(resvRef, {
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
        const booked = Math.max(0, (s.data().booked || 0) - roomsRequested);
        tx.set(nightRefs[i], {
          booked,
          reservationIds: (s.data().reservationIds || []).filter(id => id !== reservation.id),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });
    });
  }, []);

  return { bookReservation, cancelReservation, RoomUnavailableError };
}
