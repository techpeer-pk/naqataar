import { UtensilsCrossed, Store, Bike, MapPin, Clock, StickyNote, X, Trash2, Loader2 } from 'lucide-react';
import Modal from '../superadmin/Modal';
import PaymentProofLink from './PaymentProofLink';
import { STATUS_LABELS, CANCELLABLE, nextActionsFor } from '../../pages/eatsadmin/OrdersPage';
import { orderRef, bookingRef, formatDateTime } from '../../utils/format';
import './OrderDetailModal.css';

// Full itemized breakdown — the Orders table's "Items" column joins
// everything into one line (`Item x1, Item x1, ...`), which is illegible
// past 2-3 items. This is the detail view: click a row to see it properly.
// Actions live here too (not in the table) — reuses the exact same
// nextActionsFor/CANCELLABLE logic the table used to render inline.
export default function OrderDetailModal({ order, open, onClose, actionLoading, onAction, onDelete, canDelete }) {
  if (!order) return null;

  const items = order.items || [];

  return (
    <Modal open={open} onClose={onClose} title={`Order ${order.orderRef || orderRef(order.id)}`}>
      <div className="order-detail">
        <div className="order-detail-badges">
          <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span>
          {order.fulfillmentType === 'dine_in' && <span className="badge badge-dinein"><UtensilsCrossed size={11} /> Dine-in</span>}
          {order.fulfillmentType === 'pickup' && <span className="badge badge-pickup"><Store size={11} /> Self Pickup</span>}
          {order.fulfillmentType === 'delivery' && <span className="badge badge-pickup"><Bike size={11} /> Delivery</span>}
        </div>

        <div className="order-detail-section">
          <p className="order-detail-label">Customer</p>
          <p className="order-detail-name">{order.customerName}</p>
          <p className="text-muted">{order.customerPhone} · {order.customerEmail}</p>
        </div>

        <div className="order-detail-section">
          {order.fulfillmentType === 'dine_in' ? (
            <p>
              <UtensilsCrossed size={13} /> Booking {bookingRef(order.appointmentId)}
              {order.scheduledFor?.toDate && (
                <> · <Clock size={13} /> {order.scheduledFor.toDate().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</>
              )}
            </p>
          ) : order.fulfillmentType === 'pickup' ? (
            <p><Store size={13} /> Self pickup — no delivery address</p>
          ) : (
            <p><MapPin size={13} /> {order.deliveryAddress || '—'}</p>
          )}
        </div>

        <div className="order-detail-section">
          <p className="order-detail-label">Items ({items.length})</p>
          <table className="order-detail-items">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr key={i.menuItemId || idx}>
                  <td>
                    {i.name}
                    {i.notes && <span className="order-detail-item-note"><StickyNote size={11} /> {i.notes}</span>}
                  </td>
                  <td>x{i.quantity}</td>
                  <td>{i.price != null ? `PKR ${Number(i.price).toLocaleString()}` : '—'}</td>
                  <td>{i.price != null ? `PKR ${(i.price * i.quantity).toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="order-detail-total">
            <span>Total</span>
            <strong>PKR {Number(order.totalAmount || 0).toLocaleString()}</strong>
          </div>
        </div>

        {order.notes && (
          <div className="order-detail-section">
            <p className="order-detail-label">Order Notes</p>
            <p>{order.notes}</p>
          </div>
        )}

        <div className="order-detail-section">
          <p className="order-detail-label">Payment</p>
          <p className="text-muted">{order.paymentMethod === 'prepaid' ? 'Prepaid (bank transfer)' : 'Cash / pay on receipt'}</p>
          <PaymentProofLink url={order.paymentProofUrl} />
        </div>

        {order.status === 'cancelled' && order.cancelledByName && (
          <div className="order-detail-section">
            <p className="order-detail-label">Cancelled By</p>
            <p>{order.cancelledByName} <span className="text-muted">({order.cancelledByRole})</span></p>
            {order.updatedAt && <p className="text-muted">{formatDateTime(order.updatedAt)}</p>}
          </div>
        )}

        {order.status === 'cancelled' && order.cancelReason && (
          <div className="order-detail-section">
            <p className="order-detail-label">Cancellation Reason</p>
            <p>{order.cancelReason}</p>
          </div>
        )}

        {(onAction || onDelete) && (
          <div className="order-detail-section order-detail-actions">
            {nextActionsFor(order).map(({ status, icon: Icon, title, cls }) => (
              <button key={status} className={`btn btn-sm ${cls}`} disabled={actionLoading === order.id + status}
                onClick={() => onAction(order, status)}>
                {actionLoading === order.id + status ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><Icon size={14} /> {title}</>}
              </button>
            ))}
            {CANCELLABLE.includes(order.status) && (
              <button className="btn btn-danger btn-sm" disabled={actionLoading === order.id + 'cancelled'}
                onClick={() => onAction(order, 'cancelled')}>
                {actionLoading === order.id + 'cancelled' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><X size={14} /> Cancel</>}
              </button>
            )}
            {canDelete && (
              <button className="btn btn-ghost btn-sm" disabled={actionLoading === order.id + 'delete'}
                onClick={() => onDelete(order)}>
                {actionLoading === order.id + 'delete' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><Trash2 size={14} /> Delete</>}
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
