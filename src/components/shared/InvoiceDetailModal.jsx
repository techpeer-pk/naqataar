import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import Modal from '../superadmin/Modal';
import { useAppointments } from '../../hooks/useAppointments';
import { useOrders } from '../../hooks/useOrders';
import { invoiceRef } from '../../utils/format';
import './InvoiceDetailModal.css';

function toDate(ts) {
  if (!ts) return null;
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return Number.isNaN(d?.getTime()) ? null : d;
}
function fmt(ts) {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

// Pure presentational — rendered twice (on-screen inside the Modal, and via
// a body-level portal for print). Identical markup both times so what you
// print always matches what you saw.
function InvoiceDocument({ invoice, periodAppointments, periodOrders, bookingsRevenue, ordersRevenue, hasUnpricedBooking, summaryLoading, summaryError }) {
  return (
    <div className="invoice-doc">
      <div className="invoice-doc-header">
        <div>
          <p className="invoice-doc-brand">Qunjee</p>
          <p className="text-muted">hello@qunjee.com</p>
          <p className="text-muted">Karachi, Pakistan</p>
        </div>
        <div className="invoice-doc-meta">
          <p><strong>Invoice</strong> {invoiceRef(invoice.id)}</p>
          <p>Issued {fmt(invoice.createdAt)}</p>
        </div>
      </div>

      <div className="invoice-doc-billto">
        <p className="invoice-doc-label">Billed To</p>
        <p className="invoice-doc-billto-name">{invoice.businessName || '—'}</p>
      </div>

      <table className="invoice-doc-table">
        <thead>
          <tr><th>Description</th><th>Period</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Qunjee Platform Subscription Fee</td>
            <td>{fmt(invoice.periodStart)} – {fmt(invoice.periodEnd)}</td>
            <td>PKR {Number(invoice.amount || 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="invoice-doc-total">
        <span>Total</span>
        <strong>PKR {Number(invoice.amount || 0).toLocaleString()}</strong>
      </div>

      <div className="invoice-doc-activity">
        <p className="invoice-doc-label">Business Activity This Period</p>
        {summaryLoading ? (
          <p className="text-muted">Loading…</p>
        ) : summaryError ? (
          <p className="text-muted">Activity summary not available right now.</p>
        ) : (
          <>
            <p className="invoice-doc-activity-line">
              {periodAppointments.length} booking{periodAppointments.length === 1 ? '' : 's'}
              {' · '}
              {periodOrders.length} order{periodOrders.length === 1 ? '' : 's'}
            </p>
            <div className="invoice-doc-revenue-row">
              <span>Bookings revenue{hasUnpricedBooking ? '*' : ''}</span>
              <span>PKR {bookingsRevenue.toLocaleString()}</span>
            </div>
            <div className="invoice-doc-revenue-row">
              <span>Orders revenue</span>
              <span>PKR {ordersRevenue.toLocaleString()}</span>
            </div>
            {hasUnpricedBooking && (
              <p className="text-muted invoice-doc-activity-note">
                * One or more bookings have no price set on their service — bookings revenue may be undercounted.
              </p>
            )}
          </>
        )}
        <p className="text-muted invoice-doc-activity-note">
          Reference only — this is a flat subscription fee, not commission. Doesn't affect the amount above.
        </p>
      </div>

      <p className="invoice-doc-footer text-muted">
        Payment confirmed off-app (bank transfer) — this is a record, not a payable document.
      </p>
    </div>
  );
}

// Print-to-A4 invoice — no PDF library, just a print-only CSS layout and the
// browser's own "Print > Save as PDF". See docs/Billing-Subscription.md's
// staged recommendation (HTML first, PDF library later only if needed).
//
// Printing straight out of the on-screen copy doesn't work: Modal.jsx is
// `position: fixed` with an `overflow-y: auto` inner box, and print media
// doesn't handle a fixed-position ancestor's viewport math the same way
// screen does — content past the first fold gets clipped (confirmed:
// printed blank past the header). Fix: portal a second, print-only copy of
// the same content straight to <body>, outside that ancestor chain
// entirely, and print-CSS shows only the portal.
//
// The activity summary (bookings/orders in the billing period) is informational
// only — it does NOT affect the invoice amount, which is always the flat
// subscription fee. Fetched defensively: loading/error states are explicit,
// every field access is null-guarded, and a failed fetch degrades to "not
// available" instead of ever throwing during render (see the earlier
// Checkout crash — same class of bug, not repeating it here).
export default function InvoiceDetailModal({ invoice, open, onClose }) {
  const { appointments, fetchByBusiness: fetchAppointments } = useAppointments();
  const { orders, fetchByBusiness: fetchOrders } = useOrders();
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError]     = useState(false);

  const businessId = invoice?.businessId || null;

  useEffect(() => {
    if (!open || !businessId) return;
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(false);
    Promise.all([fetchAppointments(businessId), fetchOrders(businessId)])
      .catch(() => { if (!cancelled) setSummaryError(true); })
      .finally(() => { if (!cancelled) setSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [open, businessId]);

  if (!invoice) return null;

  const periodStartMs = toDate(invoice.periodStart)?.getTime() ?? 0;
  // periodEnd comes from a date-only calendar pick (BusinessDetailPage's
  // MonthCalendarPicker), stored as that day's midnight — extend to the end
  // of that day so same-day activity (booked/ordered any time before
  // midnight) still counts, matching what "active until <date>" implies.
  const periodEndDate = toDate(invoice.periodEnd);
  const periodEndMs = periodEndDate
    ? new Date(periodEndDate.getFullYear(), periodEndDate.getMonth(), periodEndDate.getDate(), 23, 59, 59, 999).getTime()
    : Date.now();

  const inPeriod = (ts) => {
    const d = toDate(ts);
    return !!d && d.getTime() >= periodStartMs && d.getTime() <= periodEndMs;
  };

  const periodAppointments = summaryError ? [] : (appointments || []).filter(a => inPeriod(a?.appointmentDatetime));
  const periodOrders       = summaryError ? [] : (orders || []).filter(o => inPeriod(o?.createdAt));

  // Reference-only revenue totals — this is a flat subscription fee invoice,
  // not commission-based, so these numbers deliberately never touch the
  // Amount/Total above. Some services may have no price set, so the
  // bookings total can undercount — flagged rather than silently wrong.
  const bookingsRevenue  = periodAppointments.reduce((sum, a) => sum + (Number(a?.servicePrice) || 0), 0);
  const ordersRevenue    = periodOrders.reduce((sum, o) => sum + (Number(o?.totalAmount) || 0), 0);
  const hasUnpricedBooking = periodAppointments.some(a => a?.servicePrice == null);

  const docProps = { invoice, periodAppointments, periodOrders, bookingsRevenue, ordersRevenue, hasUnpricedBooking, summaryLoading, summaryError };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Invoice ${invoiceRef(invoice.id)}`}>
        <InvoiceDocument {...docProps} />
        <button type="button" className="btn btn-primary no-print" style={{ marginTop: '1rem' }} onClick={() => window.print()}>
          <Printer size={16} /> Print / Save as PDF
        </button>
      </Modal>

      {open && createPortal(
        <div className="invoice-print-portal">
          <InvoiceDocument {...docProps} />
        </div>,
        document.body
      )}
    </>
  );
}
