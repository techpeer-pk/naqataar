import { useState, useEffect } from 'react';
import { Building2, Phone, Mail, StickyNote, AlertTriangle, Check, X, CheckCircle, UserX, Trash2, Loader2 } from 'lucide-react';
import Modal from '../superadmin/Modal';
import PaymentProofLink from './PaymentProofLink';
import { CancelReasonFields } from './CancelReasonDialog';
import { BUSINESS_BOOKING_CANCEL_REASONS } from '../../utils/cancelReasons';
import { bookingRef, formatTime12h, formatDateTime } from '../../utils/format';
import './AppointmentDetailModal.css';
import { t, statusLabel } from '../../i18n';

// Appointments table trims down to just enough to scan/search a list —
// service/date/time/notes/payment-proof/actions live here, click a row to
// see them. Same click-row-for-detail convention as OrderDetailModal.jsx /
// ReservationDetailModal.jsx.
export default function AppointmentDetailModal({ appointment: a, open, onClose, actionLoading, onAction, onDelete, canAct = true, canDelete = true, canNoShow = false, onNoShow, noShowHint }) {
  // A plain window.confirm() was too easy to blindly click through —
  // admins kept cancelling bookings by mistake. Typing the word is a much
  // harder slip to make by accident.
  const [cancelling, setCancelling] = useState(false);
  const [cancelText, setCancelText] = useState('');
  // Business-side cancel always needs a reason (only admin/Ops/SuperAdmin
  // ever open this modal) — see src/utils/cancelReasons.js.
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    setCancelling(false);
    setCancelText('');
  }, [a?.id, open]);

  if (!a) return null;

  const services = a.services?.length ? a.services : [{ name: a.serviceName, duration: a.serviceDuration, price: a.servicePrice }];

  // Flags a request the business never acted on before its own reserved
  // time passed — still just a visual heads-up for now, no auto-status
  // change or penalty logic yet (that's a bigger policy call, TBD).
  const overdue = a.status === 'pending' && (a.appointmentDatetime?.toDate?.()?.getTime() ?? Infinity) < Date.now();

  const cancelReady = cancelText.trim().toLowerCase() === 'cancel' && cancelReason.length > 0;

  const confirmCancel = () => {
    // if (cancelText.trim().toLowerCase() !== 'cancel') return;
    // onAction(a, 'cancelled');
    if (!cancelReady) return;
    onAction(a, 'cancelled', cancelReason);
    setCancelling(false);
    setCancelText('');
  };

  return (
    <Modal open={open} onClose={onClose} title={t('Booking {ref}', { ref: a.bookingRef || bookingRef(a.id) })}
      className={a.priceFlag ? 'sa-modal-price-flag' : ''}>
      <div className="appt-detail">
        <div className="appt-detail-badges">
          <span className={`badge badge-${a.status}`}>{statusLabel(a.status)}</span>
          {overdue && (
            <span className="badge badge-overdue" title="Reserved time already passed with no response from the business">
              <AlertTriangle size={11} /> Overdue
            </span>
          )}
          {a.priceFlag && (
            <span
              className={`badge badge-price-flag ${a.status !== 'cancelled' ? 'badge-price-flag-blink' : ''}`}
              title={a.priceFlagReason || t('Price mismatch detected')}
            >
              <AlertTriangle size={11} /> Price
            </span>
          )}
          {/* Kept apart from Confirm/Mark Done at the bottom, on purpose —
              those two sat right next to Cancel and were getting mis-tapped
              for it. */}
          {canAct && !cancelling && (a.status === 'pending' || a.status === 'confirmed') && (
            <button className="btn btn-danger btn-sm appt-detail-cancel" onClick={() => setCancelling(true)}>
              <X size={14} /> Cancel
            </button>
          )}
        </div>

        {cancelling && (
          <div className="appt-detail-cancel-confirm">
            <CancelReasonFields presets={BUSINESS_BOOKING_CANCEL_REASONS} required onChange={setCancelReason} resetKey={`${a.id}-${cancelling}`} />
            <p>{t('Type')} <strong>cancel</strong> {t("to confirm. This action is recorded against your account and can't be undone.")}</p>
            <div className="appt-detail-cancel-confirm-row">
              <input
                type="text"
                className="form-control"
                autoFocus
                value={cancelText}
                onChange={e => setCancelText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmCancel(); }}
                placeholder="cancel"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setCancelling(false); setCancelText(''); }}>
                {t('Never mind')}
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                // disabled={cancelText.trim().toLowerCase() !== 'cancel' || actionLoading === a.id + 'cancelled'}
                disabled={!cancelReady || actionLoading === a.id + 'cancelled'}
                onClick={confirmCancel}
              >
                {actionLoading === a.id + 'cancelled' ? <><Loader2 size={14} className="icon-spin" /> {t('Wait…')}</> : <><X size={14} /> {t('Confirm Cancel')}</>}
              </button>
            </div>
          </div>
        )}

        <div className="appt-detail-section">
          <p className="appt-detail-label">{t('Clinic')}</p>
          <p className="appt-detail-name"><Building2 size={13} /> {a.businessName}</p>
          {a.businessAddress && <p className="text-muted">{a.businessAddress}</p>}
        </div>

        <div className="appt-detail-section">
          <p className="appt-detail-label">{t('Customer')}</p>
          <p className="appt-detail-name">{a.customerName}</p>
          <p className="text-muted"><Phone size={12} /> {a.customerPhone} · <Mail size={12} /> {a.customerEmail}</p>
        </div>

        <div className="appt-detail-section">
          <p className="appt-detail-label">{t('Booking Date & Time')}</p>
          <p>{a.date} · {formatTime12h(a.time)}</p>
        </div>

        {a.status === 'cancelled' && a.cancelledByName && (
          <div className="appt-detail-section">
            <p className="appt-detail-label">{t('Cancelled By')}</p>
            <p>{a.cancelledByName} <span className="text-muted">({a.cancelledByRole})</span></p>
            {a.updatedAt && <p className="text-muted">{formatDateTime(a.updatedAt)}</p>}
          </div>
        )}

        {a.status === 'cancelled' && a.cancelReason && (
          <div className="appt-detail-section">
            <p className="appt-detail-label">{t('Cancellation Reason')}</p>
            <p>{a.cancelReason}</p>
          </div>
        )}

        <div className="appt-detail-section">
          <p className="appt-detail-label">Service{services.length > 1 ? 's' : ''}</p>
          <table className="appt-detail-table">
            <tbody>
              {services.map((s, i) => (
                <tr key={i}>
                  <td>{s.name}{s.duration ? ` (${s.duration} min)` : ''}</td>
                  <td>{s.price != null ? `PKR ${Number(s.price).toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {a.servicePrice != null && (
            <div className="appt-detail-total">
              <span>{t('Total')}</span>
              <strong>PKR {Number(a.servicePrice).toLocaleString()}</strong>
            </div>
          )}
        </div>

        {a.notes && (
          <div className="appt-detail-section">
            <p className="appt-detail-label">{t('Notes')}</p>
            <p><StickyNote size={12} /> {a.notes}</p>
          </div>
        )}

        {a.paymentProofUrl && (
          <div className="appt-detail-section">
            <p className="appt-detail-label">{t('Payment Proof')}</p>
            <PaymentProofLink url={a.paymentProofUrl} />
          </div>
        )}

        {(canAct || canDelete) && (
          <div className="appt-detail-section appt-detail-actions">
            {canAct && a.status === 'pending' && (
              <button className="btn btn-sm action-confirm" disabled={actionLoading === a.id + 'confirmed'}
                onClick={() => onAction(a, 'confirmed')}>
                {actionLoading === a.id + 'confirmed' ? <><Loader2 size={14} className="icon-spin" /> {t('Wait…')}</> : <><Check size={14} /> {t('Confirm')}</>}
              </button>
            )}
            {/* Cancel used to live here as a plain button next to Confirm/Mark
                Done — moved up next to the status badge with a type-to-confirm
                step instead, since it kept getting mis-tapped for Confirm.
            {canAct && (a.status === 'pending' || a.status === 'confirmed') && (
              <button className="btn btn-danger btn-sm" disabled={actionLoading === a.id + 'cancelled'}
                onClick={() => onAction(a, 'cancelled')}>
                {actionLoading === a.id + 'cancelled' ? <><Loader2 size={14} className="icon-spin" /> {t('Wait…')}</> : <><X size={14} /> {t('Cancel')}</>}
              </button>
            )}
            */}
            {canAct && a.status === 'confirmed' && (
              <button className="btn btn-sm action-complete" disabled={actionLoading === a.id + 'completed'}
                onClick={() => onAction(a, 'completed')}>
                {actionLoading === a.id + 'completed' ? <><Loader2 size={14} className="icon-spin" /> {t('Wait…')}</> : <><CheckCircle size={14} /> {t('Mark Done')}</>}
              </button>
            )}
            {canAct && canNoShow && a.status === 'confirmed' && (
              <button className="btn btn-danger btn-sm" disabled={actionLoading === a.id + 'no_show'}
                onClick={() => onNoShow(a)} title={noShowHint}>
                {actionLoading === a.id + 'no_show' ? <><Loader2 size={14} className="icon-spin" /> {t('Wait…')}</> : <><UserX size={14} /> {t('No-Show')}</>}
              </button>
            )}
            {canDelete && (
              <button className="btn btn-ghost btn-sm" disabled={actionLoading === a.id + 'delete'}
                onClick={() => onDelete(a)}>
                {actionLoading === a.id + 'delete' ? <><Loader2 size={14} className="icon-spin" /> {t('Wait…')}</> : <><Trash2 size={14} /> {t('Delete')}</>}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
