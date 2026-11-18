import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, LogIn, MapPin, X, Bike, UtensilsCrossed, Clock, CalendarCheck, ShieldCheck, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import CancelReasonDialog from '../../../components/shared/CancelReasonDialog';
import { CUSTOMER_CANCEL_REASONS } from '../../../utils/cancelReasons';
import { useAuth } from '../../../context/AuthContext';
import { useOrders } from '../../../hooks/useOrders';
import { useOrderPlacement } from '../../../hooks/useOrderPlacement';
import { useEmailNotifications } from '../../../hooks/useEmailNotifications';
import { orderRef, bookingRef } from '../../../utils/format';
import Sk from '../../../components/shared/Skeleton';
import './MyOrdersPage.css';

const STATUS_LABELS = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  preparing:        'Preparing',
  out_for_delivery: 'On the way',
  completed:        'Delivered',
  cancelled:        'Cancelled',
};

const CANCELLABLE = ['pending', 'confirmed', 'preparing'];

export default function MyOrdersPage() {
  const { user, isCustomer } = useAuth();
  const { orders, loading, subscribeByEmail } = useOrders();
  const { cancelOrder } = useOrderPlacement();
  const { sendOrderCancellation } = useEmailNotifications();
  const [searched, setSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [searchParams] = useSearchParams();
  const targetOrderId  = searchParams.get('order');

  useEffect(() => {
    if (user && isCustomer) {
      setSearched(true);
      // Live subscription — Ops advancing an order's status (or a cancel
      // from this page) shows up here without a manual reload.
      return subscribeByEmail(user.email);
    }
  }, [user, isCustomer]);

  // Deep link from "Advance Food Order" on a booking card — jump straight
  // to the matching order instead of dropping the customer at the top.
  useEffect(() => {
    if (!targetOrderId || loading) return;
    const el = document.getElementById(`order-card-${targetOrderId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetOrderId, loading, orders.length]);

  // Cancel opens CancelReasonDialog first (reason optional for customers);
  // it calls back here with the reason ('' if skipped).
  const [cancelTarget, setCancelTarget] = useState(null);

  const handleCancel = async (order, reason) => {
    // if (!window.confirm('Cancel this order? This action is recorded against your account.')) return;
    if (reason === undefined) { setCancelTarget(order); return; }
    setCancellingId(order.id);
    try {
      await cancelOrder(order, { role: 'customer', uid: user?.uid, name: user?.displayName, reason });
      await sendOrderCancellation(order, reason);
      toast.success('Order cancelled.');
    } catch {
      toast.error('Could not cancel. Please try again.');
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
    }
  };

  return (
    <div className="my-orders page">
      <div className="container my-orders-container">
        <div className="my-orders-header">
          <ClipboardList size={28} />
          <div>
            <h1>My Orders</h1>
            {user && isCustomer
              ? <p className="text-muted">Signed in as <strong>{user.email}</strong></p>
              : <p className="text-muted">Sign in to see your orders.</p>
            }
          </div>
        </div>

        {/* Same policy as bookings: no anonymous lookup — sign in to view. */}
        {!(user && isCustomer) && (
          <div className="empty-state">
            <LogIn size={40} />
            <p>Sign in to see your orders.</p>
            <Link to="/index/login" className="btn btn-primary">Sign In</Link>
          </div>
        )}

        {searched && loading && (
          <div className="my-orders-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card"><div className="card-body">
                <Sk w="50%" h="1rem" mb="0.5rem" />
                <Sk w="70%" h="0.85rem" />
              </div></div>
            ))}
          </div>
        )}

        {searched && !loading && (
          orders.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={40} />
              <p>No orders yet.</p>
              <Link to="/qunjeeats" className="btn btn-primary">Order Food</Link>
            </div>
          ) : (
            <div className="my-orders-list">
              {orders.map(o => (
                <div key={o.id} id={`order-card-${o.id}`} className={`card${o.id === targetOrderId ? ' card-highlighted' : ''}`}>
                  <div className="card-body">
                    <div className="my-order-top">
                      <div>
                        <p className="my-order-biz">{o.businessName}</p>
                        <p className="my-order-ref">
                          ID: {orderRef(o.id)}
                          {o.fulfillmentType === 'dine_in' && (
                            <> · <span className="badge badge-dinein">Dine-in</span></>
                          )}
                          {o.fulfillmentType === 'pickup' && (
                            <> · <span className="badge badge-pickup">Self Pickup</span></>
                          )}
                        </p>
                      </div>
                      <span className={`badge badge-${o.status}`}>
                        {o.status === 'completed' && o.fulfillmentType === 'dine_in'
                          ? 'Served'
                          : o.status === 'completed' && o.fulfillmentType === 'pickup'
                          ? 'Picked up'
                          : STATUS_LABELS[o.status] || o.status}
                      </span>
                    </div>
                    <p className="my-order-items">
                      {(o.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}
                    </p>
                    <div className="my-order-meta">
                      {o.fulfillmentType === 'dine_in' ? (
                        <>
                          <span><UtensilsCrossed size={13} /> PKR {Number(o.totalAmount || 0).toLocaleString()} (prepaid)</span>
                          {o.scheduledFor?.toDate && (
                            <span><Clock size={13} /> {o.scheduledFor.toDate().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          )}
                        </>
                      ) : o.fulfillmentType === 'pickup' ? (
                        <span><Store size={13} /> PKR {Number(o.totalAmount || 0).toLocaleString()} ({o.paymentMethod === 'prepaid' ? 'prepaid' : 'pay on pickup'})</span>
                      ) : (
                        <>
                          <span><Bike size={13} /> PKR {Number(o.totalAmount || 0).toLocaleString()} ({o.paymentMethod === 'prepaid' ? 'prepaid' : 'COD'})</span>
                          {o.deliveryAddress && <span><MapPin size={13} /> {o.deliveryAddress}</span>}
                        </>
                      )}
                    </div>
                    {o.status === 'cancelled' && o.cancelReason && (
                      <p className="verify-pending-note">
                        <X size={13} /> Cancellation reason: {o.cancelReason}
                      </p>
                    )}
                    {o.status === 'pending' && o.paymentProofUrl && (
                      <p className="verify-pending-note">
                        <ShieldCheck size={13} /> Payment screenshot received — the business is verifying it before confirming.
                      </p>
                    )}
                    {o.fulfillmentType === 'dine_in' && o.appointmentId && (
                      <Link to={`/index/my-appointments?appt=${o.appointmentId}`} className="my-order-booking-link">
                        <CalendarCheck size={14} />
                        <span>
                          <strong>Advance Food Order</strong> for your table booking — {bookingRef(o.appointmentId)}
                        </span>
                      </Link>
                    )}
                    {user && o.customerId === user.uid && CANCELLABLE.includes(o.status) && (
                      <button
                        className="btn btn-danger btn-sm my-order-cancel"
                        disabled={cancellingId === o.id}
                        onClick={() => handleCancel(o)}
                      >
                        <X size={14} /> {cancellingId === o.id ? 'Cancelling…' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <CancelReasonDialog
        open={!!cancelTarget}
        title="Cancel Order"
        message="This action is recorded against your account and can't be undone."
        presets={CUSTOMER_CANCEL_REASONS}
        loading={!!cancelTarget && cancellingId === cancelTarget.id}
        onConfirm={reason => handleCancel(cancelTarget, reason)}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
