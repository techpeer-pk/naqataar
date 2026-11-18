import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { CheckCircle, Phone, Banknote, UtensilsCrossed, ClipboardList, Download } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { db } from '../../../firebase';
import { requestFcmToken } from '../../../utils/fcmToken';
import { orderRef } from '../../../utils/format';
import './OrderConfirmationPage.css';

export default function OrderConfirmationPage() {
  const { state } = useLocation();
  const { order } = state || {};
  const ref = order?.orderRef || orderRef(order?.id);
  const [saving, setSaving] = useState(false);
  const cardRef = useRef(null);

  // Save this device's push token on the fresh order so the Cloud Function
  // can notify the customer on every status change (confirmed → delivered).
  // Best-effort: permission denied / unsupported browser just means no push.
  useEffect(() => {
    if (!order?.id) return;
    requestFcmToken().then(token => {
      if (token) updateDoc(doc(db, 'orders', order.id), { fcmToken: token }).catch(() => {});
    });
  }, [order?.id]);

  // Same one-tap proof-of-order image as ConfirmationPage.jsx (booking
  // receive) — no print dialog, works the same on desktop and mobile. The
  // action buttons are excluded from the capture via the `no-capture` class.
  const handleSaveToDevice = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => !node.classList?.contains('no-capture'),
      });
      const link = document.createElement('a');
      link.download = `order-${ref}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error('Could not save image. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="eats-confirm page">
      <div className="container eats-confirm-container">
        <div className="card fade-up" ref={cardRef}>
          <div className="card-body text-center">
            <div className="eats-confirm-icon"><CheckCircle size={52} /></div>
            <h1 className="eats-confirm-title">Order Placed!</h1>
            <p className="eats-confirm-sub">
              Our team will contact you shortly to confirm your order.
            </p>

            {ref && (
              <div className="eats-confirm-ref">
                <span className="eats-confirm-ref-label">Order ID</span>
                <span className="eats-confirm-ref-code">{ref}</span>
              </div>
            )}

            {order && (
              <div className="eats-confirm-details">
                <div className="eats-confirm-row">
                  <span className="detail-label">Restaurant</span>
                  <span>{order.businessName}</span>
                </div>
                {order.items?.map(i => (
                  <div key={i.menuItemId} className="eats-confirm-row">
                    <span className="detail-label">{i.name} × {i.quantity}</span>
                    <span>{i.price != null ? `PKR ${(i.price * i.quantity).toLocaleString()}` : ''}</span>
                  </div>
                ))}
                <div className="eats-confirm-row eats-confirm-total">
                  <span className="detail-label">Total</span>
                  <strong>PKR {Number(order.totalAmount || 0).toLocaleString()}</strong>
                </div>
                {order.fulfillmentType === 'dine_in' ? (
                  <div className="eats-confirm-row">
                    <span className="detail-label">Dine-in</span>
                    <span>{order.scheduledDate}{order.scheduledTime ? ` · ${order.scheduledTime}` : ''}</span>
                  </div>
                ) : (
                  <div className="eats-confirm-row">
                    <span className="detail-label">Address</span>
                    <span>{order.deliveryAddress}</span>
                  </div>
                )}
              </div>
            )}

            <div className="eats-confirm-note">
              <Banknote size={16} />
              {order?.fulfillmentType === 'dine_in' ? (
                // Fixed 2026-09-11 — dine-in pre-orders are prepaid upfront,
                // not COD at the table (see CheckoutPage.jsx's requiresPrepay
                // = !!dineIn). Old copy kept for rollback:
                // <span>Payment at the restaurant — your food will be ready at your booked time.</span>
                <span>Paid in advance — your food will be ready at your booked time.</span>
              ) : (
                <span>Payment <strong>Cash on Delivery</strong> — pay the rider in cash.</span>
              )}
            </div>
            {/* Hibernated (2026-09-11) — never expose a business's direct
            contact to the customer (disintermediation risk); businessPhone
            stays on the order doc for Qunjee's own record, just not rendered.
            {order?.businessPhone && (
              <div className="eats-confirm-note">
                <Phone size={16} />
                <span>Questions? Call the restaurant: <a href={`tel:${order.businessPhone}`}>{order.businessPhone}</a></span>
              </div>
            )}
            */}

            <div className="eats-confirm-actions no-capture">
              {order && (
                <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSaveToDevice}>
                  <Download size={16} /> {saving ? 'Saving…' : 'Save to Device'}
                </button>
              )}
              <Link to="/qunjeeats/my-orders" className="btn btn-ghost">
                <ClipboardList size={16} /> My Orders
              </Link>
              <Link to="/qunjeeats" className="btn btn-ghost">
                <UtensilsCrossed size={16} /> Order More
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
