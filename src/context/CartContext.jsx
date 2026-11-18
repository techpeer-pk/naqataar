import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * QunjeeEats cart — client-only, localStorage-persisted, one business at a
 * time. Mounted app-wide (see App.jsx) so the booking confirmation page can
 * start a dine-in pre-order cart (F1); it stays inert until something writes
 * to it. Not stored in Firestore on purpose: a cart has no business value
 * until checkout, and server-persisting it would mean rules, billed writes
 * per tap, and abandoned-cart cleanup.
 */

const STORAGE_KEY = 'qunjeeats_cart_v1';

const EMPTY_CART = {
  businessId:   null,
  businessName: '',
  items: [],   // [{ menuItemId, name, price, quantity, notes }]
  // Dine-in pre-order context — set from the booking confirmation page.
  // { appointmentId, scheduledFor (ISO), date, time, customerName, customerPhone, customerEmail }
  dineIn: null,
};

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_CART, ...parsed, items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return EMPTY_CART;
  }
}

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch { /* storage full/blocked — cart just won't survive a refresh */ }
  }, [cart]);

  const addItem = (business, item, qty = 1) => {
    setCart(prev => {
      // One FoodVend per cart: switching restaurants starts a fresh cart.
      const switching = prev.businessId && prev.businessId !== business.id;
      const base = switching
        ? { ...EMPTY_CART, businessId: business.id, businessName: business.name }
        : { ...prev, businessId: business.id, businessName: business.name };
      if (switching) toast(`Cart cleared — now ordering from ${business.name}`, { icon: '🛒' });

      const existing = base.items.find(i => i.menuItemId === item.id);
      const items = existing
        ? base.items.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + qty } : i)
        : [...base.items, {
            menuItemId: item.id,
            name:       item.name,
            price:      item.price ?? null,
            quantity:   qty,
            notes:      '',
          }];
      return { ...base, items };
    });
  };

  const updateQty = (menuItemId, quantity) => {
    setCart(prev => quantity <= 0
      ? { ...prev, items: prev.items.filter(i => i.menuItemId !== menuItemId) }
      : { ...prev, items: prev.items.map(i => i.menuItemId === menuItemId ? { ...i, quantity } : i) }
    );
  };

  const removeItem = (menuItemId) => updateQty(menuItemId, 0);

  const clearCart = () => setCart(EMPTY_CART);

  // Dine-in pre-order (F1): tie the cart to a booking. If the cart already
  // belongs to this business (customer came FROM checkout via the
  // Delivery/Dine-in choice), keep their items; otherwise start fresh.
  // Checkout switches to dine_in mode while cart.dineIn is set; adding items
  // from a different business clears it along with the rest of the cart.
  const startDineInOrder = (business, dineIn) => {
    setCart(prev => prev.businessId === business.id
      ? { ...prev, businessName: business.name, dineIn }
      : { ...EMPTY_CART, businessId: business.id, businessName: business.name, dineIn });
  };

  // Back to delivery — drops the booking link, keeps the items.
  const clearDineIn = () => setCart(prev => ({ ...prev, dineIn: null }));

  const itemCount = useMemo(
    () => cart.items.reduce((n, i) => n + i.quantity, 0),
    [cart.items]
  );
  const subtotal = useMemo(
    () => cart.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0),
    [cart.items]
  );

  return (
    <CartContext.Provider value={{ cart, addItem, updateQty, removeItem, clearCart, startDineInOrder, clearDineIn, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
