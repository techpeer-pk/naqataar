import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, UtensilsCrossed, X, ZoomIn } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import './MenuItemCard.css';

export default function MenuItemCard({ business, item }) {
  const { cart, addItem, updateQty } = useCart();
  const [showLightbox, setShowLightbox] = useState(false);
  const inCart = cart.businessId === business.id
    ? cart.items.find(i => i.menuItemId === item.id)
    : null;

  return (
    <div className={`menu-item card ${item.isAvailable === false ? 'menu-item--off' : ''}`}>
      <div
        className={`menu-item-photo-wrap ${item.image ? 'menu-item-photo-wrap-clickable' : ''}`}
        onClick={() => item.image && setShowLightbox(true)}
      >
        {item.image
          ? (
            <>
              <img src={item.image} alt={item.name} className="menu-item-photo" />
              <span className="zoom-badge"><ZoomIn size={11} /> Zoom</span>
            </>
          )
          : <div className="menu-item-photo menu-item-photo-placeholder"><UtensilsCrossed size={26} /></div>
        }
        {item.isAvailable === false && <span className="menu-item-unavailable-badge">Unavailable</span>}
      </div>

      {showLightbox && createPortal(
        <div className="menu-item-lightbox-overlay" onClick={() => setShowLightbox(false)}>
          <button type="button" className="menu-item-lightbox-close" onClick={() => setShowLightbox(false)}>
            <X size={22} />
          </button>
          <img src={item.image} alt={item.name} className="menu-item-lightbox-img" onClick={e => e.stopPropagation()} />
          <p className="menu-item-lightbox-caption">{item.name}</p>
        </div>,
        document.body
      )}

      <div className="menu-item-body">
        <p className="menu-item-name">{item.name}</p>
        {item.description && <p className="menu-item-desc">{item.description}</p>}

        <div className="menu-item-footer">
          {item.price != null && (
            <span className="menu-item-price">PKR {Number(item.price).toLocaleString()}</span>
          )}

          {item.isAvailable !== false && (
            inCart ? (
              <div className="qty-stepper">
                <button className="qty-btn" onClick={() => updateQty(item.id, inCart.quantity - 1)} aria-label="Decrease">
                  <Minus size={13} />
                </button>
                <span className="qty-count">{inCart.quantity}</span>
                <button className="qty-btn" onClick={() => updateQty(item.id, inCart.quantity + 1)} aria-label="Increase">
                  <Plus size={13} />
                </button>
              </div>
            ) : (
              <button className="qty-btn qty-btn-add" onClick={() => addItem(business, item)} aria-label="Add">
                <Plus size={16} />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
