import { useCallback } from 'react';
import {
  collection, doc, addDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * QunjeeEats order placement.
 *
 * Unlike appointment booking (useBooking), there is no contested shared state
 * here — MVP menu items carry no stock/capacity — so placing an order is a
 * plain addDoc, not a transaction. If per-item stock limits ever ship, this
 * is the seam to upgrade to runTransaction, mirroring useBooking.
 */
export function useOrderPlacement() {
  // `dineIn` (optional) marks an F1 pre-order tied to a booking:
  // { appointmentId, scheduledFor (ISO string) } — no delivery address needed,
  // the customer eats at the restaurant at their booked time. `isPickup`
  // (optional) marks a self-pickup order — same as dine_in, no address, but
  // not tied to a booking.
  const placeOrder = useCallback(async ({ business, items, customer, deliveryAddress, notes = '', dineIn = null, isPickup = false, paymentProofUrl = null }) => {
    const totalAmount = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);
    const fulfillmentType = dineIn ? 'dine_in' : (isPickup ? 'pickup' : 'delivery');

    const ref = await addDoc(collection(db, 'orders'), {
      businessId:      business.id,
      businessName:    business.name,
      businessAddress: business.address || '',
      businessPhone:   business.phone || '',
      fulfillmentType,
      appointmentId:   dineIn?.appointmentId || null,
      scheduledFor:    dineIn?.scheduledFor ? new Date(dineIn.scheduledFor) : null,
      tableNumber:     null,
      deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : '',
      items: items.map(i => ({
        menuItemId: i.menuItemId,
        name:       i.name,
        price:      i.price ?? null,
        quantity:   i.quantity,
        notes:      i.notes || '',
      })),
      totalAmount,
      notes,
      customerName:  customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email.toLowerCase().trim(),
      customerId:    customer.uid || null,
      status:        'pending',
      paymentMethod: paymentProofUrl ? 'prepaid' : 'cod',
      paymentProofUrl,
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    });

    return ref.id;
  }, []);

  // Customer self-cancel — rules only allow this while the order hasn't been
  // dispatched (pending/confirmed/preparing) and only as a status flip.
  // `actor` records who cancelled so an "I didn't cancel this" dispute has a
  // real answer — see cancellation-attribution work, Sep 2026.
  const cancelOrder = useCallback(async (order, actor) => {
    await updateDoc(doc(db, 'orders', order.id), {
      status:    'cancelled',
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
  }, []);

  return { placeOrder, cancelOrder };
}
