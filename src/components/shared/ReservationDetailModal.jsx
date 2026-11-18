import { Hotel, Phone, Mail, StickyNote, AlertTriangle, Check, X, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import Modal from '../superadmin/Modal';
import { reservationRef, formatDateTime } from '../../utils/format';
import './ReservationDetailModal.css';

const TYPE_LABELS = { hotel: 'Hotel', nayasaa: 'Rental', beachhuts: 'Beach Hut' };

// Reservations table trims down to just enough to scan/search a list —
// everything else (dates, price, notes, actions) lives here, click a row to
// see it. Same click-row-for-detail convention as OrderDetailModal.jsx.
export default function ReservationDetailModal({ reservation: r, open, onClose, actionLoading, onAction, onDelete, canAct = true, canDelete = true }) {
  if (!r) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Reservation ${r.reservationRef || reservationRef(r.id)}`}
      className={r.priceFlag ? 'sa-modal-price-flag' : ''}>
      <div className="resv-detail">
        <div className="resv-detail-badges">
          <span className="badge">{TYPE_LABELS[r.businessType] || r.businessType || '—'}</span>
          <span className={`badge badge-${r.status}`}>{r.status}</span>
          {r.priceFlag && (
            <span className={`badge badge-price-flag ${r.status !== 'cancelled' ? 'badge-price-flag-blink' : ''}`} title={r.priceFlagReason || 'Price mismatch detected'}>
              <AlertTriangle size={11} /> Price
            </span>
          )}
        </div>

        <div className="resv-detail-section">
          <p className="resv-detail-label">Business</p>
          <p className="resv-detail-name"><Hotel size={13} /> {r.businessName}</p>
        </div>

        <div className="resv-detail-section">
          <p className="resv-detail-label">Customer</p>
          <p className="resv-detail-name">{r.customerName}</p>
          <p className="text-muted"><Phone size={12} /> {r.customerPhone} · <Mail size={12} /> {r.customerEmail}</p>
        </div>

        <div className="resv-detail-section">
          <p className="resv-detail-label">{r.businessType === 'nayasaa' ? 'Rental' : 'Stay'}</p>
          <table className="resv-detail-table">
            <tbody>
              {r.roomTypeName && (
                <tr><td>{r.businessType === 'nayasaa' ? 'Outfit' : r.businessType === 'beachhuts' ? 'Hut' : 'Room Type'}</td><td>{r.roomTypeName}</td></tr>
              )}
              <tr><td>{r.businessType === 'nayasaa' ? 'Pickup' : 'Check-in'}</td><td>{r.checkIn}</td></tr>
              <tr><td>{r.businessType === 'nayasaa' ? 'Return' : 'Check-out'}</td><td>{r.checkOut}</td></tr>
              {/* <tr><td>{r.businessType === 'nayasaa' ? 'Days' : 'Nights'}</td><td>{r.nights}</td></tr> */}
              <tr><td>{['nayasaa', 'beachhuts'].includes(r.businessType) ? 'Days' : 'Nights'}</td><td>{r.nights}</td></tr>
              <tr><td>{r.businessType === 'nayasaa' ? 'Quantity' : r.businessType === 'beachhuts' ? 'Huts' : 'Rooms'}</td><td>{r.roomsRequested}</td></tr>
              {/* Nayasaa's guestCount is a fixed dummy value (see NayasaaBookingPage.jsx) —
                  not a real concept for attire rental, only show for Hotel/Beach Huts
                  where it's a real customer-entered field. */}
              {r.businessType !== 'nayasaa' && r.guestCount != null && <tr><td>Guests</td><td>{r.guestCount}</td></tr>}
            </tbody>
          </table>
          <div className="resv-detail-total">
            <span>Total</span>
            <strong>{r.totalPrice != null ? `PKR ${Number(r.totalPrice).toLocaleString()}` : '—'}</strong>
          </div>
        </div>

        {r.notes && (
          <div className="resv-detail-section">
            <p className="resv-detail-label">Notes</p>
            <p><StickyNote size={12} /> {r.notes}</p>
          </div>
        )}

        {r.status === 'cancelled' && r.cancelledByName && (
          <div className="resv-detail-section">
            <p className="resv-detail-label">Cancelled By</p>
            <p>{r.cancelledByName} <span className="text-muted">({r.cancelledByRole})</span></p>
            {r.updatedAt && <p className="text-muted">{formatDateTime(r.updatedAt)}</p>}
          </div>
        )}

        {r.status === 'cancelled' && r.cancelReason && (
          <div className="resv-detail-section">
            <p className="resv-detail-label">Cancellation Reason</p>
            <p>{r.cancelReason}</p>
          </div>
        )}

        {(canAct || canDelete) && (
          <div className="resv-detail-section resv-detail-actions">
            {canAct && r.status === 'pending' && (
              <button className="btn btn-sm action-confirm" disabled={actionLoading === r.id + 'confirmed'}
                onClick={() => onAction(r, 'confirmed')}>
                {actionLoading === r.id + 'confirmed' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><Check size={14} /> Confirm</>}
              </button>
            )}
            {canAct && (r.status === 'pending' || r.status === 'confirmed') && (
              <button className="btn btn-danger btn-sm" disabled={actionLoading === r.id + 'cancelled'}
                onClick={() => onAction(r, 'cancelled')}>
                {actionLoading === r.id + 'cancelled' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><X size={14} /> Cancel</>}
              </button>
            )}
            {canAct && r.status === 'confirmed' && (
              <button className="btn btn-sm action-complete" disabled={actionLoading === r.id + 'completed'}
                onClick={() => onAction(r, 'completed')}>
                {actionLoading === r.id + 'completed' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><CheckCircle size={14} /> Mark Done</>}
              </button>
            )}
            {canDelete && (
              <button className="btn btn-ghost btn-sm" disabled={actionLoading === r.id + 'delete'}
                onClick={() => onDelete(r)}>
                {actionLoading === r.id + 'delete' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><Trash2 size={14} /> Delete</>}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
