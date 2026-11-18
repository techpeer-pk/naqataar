// Preset cancellation reasons, shown in CancelReasonDialog / the
// AppointmentDetailModal cancel step. Stored on the doc as the plain label
// text in `cancelReason` (or the free text when "Other" is picked), so
// reports can group by the preset wording. Keep `CANCEL_REASON_MAX` in sync
// with the size check in firestore.rules.

export const CANCEL_REASON_OTHER = 'Other';
export const CANCEL_REASON_MAX   = 300;

// Customer cancelling their own booking/order — reason optional.
export const CUSTOMER_CANCEL_REASONS = [
  'Change of plans',
  'Booked by mistake',
  'Timing no longer works',
  'Found another option',
  CANCEL_REASON_OTHER,
];

// Business owner / Ops / SuperAdmin cancelling a booking — reason required.
export const BUSINESS_BOOKING_CANCEL_REASONS = [
  'Customer requested',
  'Fully booked / no capacity',
  'Closed at that time',
  'Payment not received / invalid',
  'Suspected fake booking',
  CANCEL_REASON_OTHER,
];

// Business owner / Eats Ops / SuperAdmin cancelling a food order — required.
export const BUSINESS_ORDER_CANCEL_REASONS = [
  'Customer requested',
  'Item(s) unavailable',
  'Kitchen closed / too busy',
  'Payment not received / invalid',
  'Suspected fake order',
  CANCEL_REASON_OTHER,
];
