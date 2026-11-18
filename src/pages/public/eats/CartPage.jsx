import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import './CartPage.css';

export default function CartPage() {
  const { cart, updateQty, removeItem, clearCart, itemCount, subtotal } = useCart();
  const navigate = useNavigate();

  if (itemCount === 0) {
    return (
      <div className="container page">
        <div className="empty-state">
          <ShoppingCart size={40} />
          <p>Your cart is empty.</p>
          <Link to="/qunjeeats" className="btn btn-primary">Browse Restaurants</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="eats-cart page">
      <div className="container eats-cart-container">
        {/* F1 dine-in pre-order carts came from /pfo (EatsBusinessPage's Menu
            is hibernated, see 2026-09-11), so "back" needs to return there,
            re-attaching the ?appt= link, not to the now menu-less page. */}
        <Link
          to={cart.dineIn ? `/pfo/${cart.businessId}?appt=${cart.dineIn.appointmentId}` : `/qunjeeats/business/${cart.businessId}`}
          className="back-link"
        >
          <ChevronLeft size={16} /> Back to Menu
        </Link>

        <h1 className="eats-cart-title">Your Cart</h1>
        <p className="text-muted eats-cart-biz">From <strong>{cart.businessName}</strong></p>

        <div className="eats-cart-list">
          {cart.items.map(item => (
            <div key={item.menuItemId} className="card">
              <div className="card-body eats-cart-row">
                <div className="eats-cart-item-info">
                  <p className="eats-cart-item-name">{item.name}</p>
                  {item.price != null && (
                    <p className="eats-cart-item-price">
                      PKR {Number(item.price).toLocaleString()} × {item.quantity} ={' '}
                      <strong>PKR {(item.price * item.quantity).toLocaleString()}</strong>
                    </p>
                  )}
                </div>
                <div className="eats-cart-controls">
                  <div className="qty-stepper">
                    <button className="qty-btn" onClick={() => updateQty(item.menuItemId, item.quantity - 1)} aria-label="Decrease">
                      <Minus size={14} />
                    </button>
                    <span className="qty-count">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.menuItemId, item.quantity + 1)} aria-label="Increase">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button className="eats-cart-remove" onClick={() => removeItem(item.menuItemId)} aria-label="Remove">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card eats-cart-summary">
          <div className="card-body">
            <div className="eats-cart-total-row">
              <span>Total ({itemCount} item{itemCount > 1 ? 's' : ''})</span>
              <strong>PKR {subtotal.toLocaleString()}</strong>
            </div>
            {cart.dineIn
              ? <p className="text-muted eats-cart-cod-note">Dine-in pre-order — paid in advance, ready at your booked time.</p>
              : <p className="text-muted eats-cart-cod-note">Cash on Delivery — delivery charges restaurant ke mutabiq.</p>}
            <button className="btn btn-primary btn-full" onClick={() => navigate('/qunjeeats/checkout')}>
              Proceed to Checkout
            </button>
            <button className="btn btn-ghost btn-full eats-cart-clear" onClick={clearCart}>
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
