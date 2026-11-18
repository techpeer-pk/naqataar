import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, UtensilsCrossed, CalendarCheck } from 'lucide-react';
import { useBusinesses } from '../../../hooks/useBusinesses';
import { useMenuItems } from '../../../hooks/useMenuItems';
import { useServices } from '../../../hooks/useServices';
import { useCart } from '../../../context/CartContext';
import { BUSINESS_TYPE_COLORS, BUSINESS_TYPE_GRADIENT_TO } from '../../../utils/businessTypeColors';
import MenuItemCard from '../../../components/eats/MenuItemCard';
import ServiceCarousel from '../../../components/eats/ServiceCarousel';
import Sk from '../../../components/shared/Skeleton';
import '../../../components/public/BusinessCard.css';
import './EatsBusinessPage.css';

export default function EatsBusinessPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchOne } = useBusinesses();
  const { menuItems, fetchAll } = useMenuItems(id);
  const { services, fetchAll: fetchServices } = useServices(id);
  const { cart, itemCount, subtotal } = useCart();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading]   = useState(true);

  // useEffect(() => {
  //   Promise.all([
  //     fetchOne(id).then(b => setBusiness(b)),
  //     fetchAll(),
  //   ]).finally(() => setLoading(false));
  // }, [id]);
  useEffect(() => {
    Promise.all([
      // Services (table photos) only feed ServiceCarousel, which only shows
      // when booking is on — skip the read otherwise. Non-critical: if it
      // fails, the carousel just doesn't render.
      fetchOne(id).then(b => {
        setBusiness(b);
        if (b?.offersBooking === true) return fetchServices().catch(() => {});
      }),
      fetchAll(),
    ]).finally(() => setLoading(false));
  }, [id]);

  // Group by category; uncategorised items go last under "Menu".
  const grouped = useMemo(() => {
    const groups = new Map();
    menuItems.forEach(item => {
      const key = item.category?.trim() || 'Menu';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()];
  }, [menuItems]);

  if (loading) {
    return (
      <div className="page container eats-biz">
        <Sk w="80px" h="1rem" r="4px" mb="1.5rem" />
        <div className="card" style={{ marginBottom: '1.5rem' }}><div className="card-body">
          <Sk w="50%" h="1.6rem" mb="0.5rem" />
          <Sk w="75%" h="0.9rem" />
        </div></div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card" style={{ marginBottom: '0.75rem' }}><div className="card-body">
            <Sk w="40%" h="1rem" mb="0.4rem" />
            <Sk w="60%" h="0.85rem" />
          </div></div>
        ))}
      </div>
    );
  }

  if (!business || business.offersOrdering !== true) {
    return (
      <div className="container page">
        <div className="empty-state">
          <UtensilsCrossed size={40} />
          <p>This restaurant is not taking orders right now.</p>
          <Link to="/qunjeeats" className="btn btn-primary">Browse Other Restaurants</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="eats-biz page">
      <div className="container">
        <button type="button" onClick={() => navigate(-1)} className="back-link"><ChevronLeft size={16} /> Back</button>

        {/* F1: dine-in pre-order in progress for this business */}
        {cart.dineIn && cart.businessId === business.id && (
          <div className="card" style={{ marginBottom: '1rem', background: '#FFF7ED', border: '1px solid #FDBA74' }}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9A3412', fontSize: '0.9rem' }}>
              <UtensilsCrossed size={16} />
              <span>
                Pre-ordering for your booking — <strong>{cart.dineIn.date}</strong>.
                Add dishes and check out; your food will be ready when you arrive.
              </span>
            </div>
          </div>
        )}

        <div
          className={`card eats-biz-header biz-card type-restaurant ${business.logo ? '' : 'no-logo'}`}
          style={{
            '--cta-color': BUSINESS_TYPE_COLORS.restaurant,
            '--card-bg': business.logo
              ? `url(${business.logo})`
              : `linear-gradient(135deg, ${BUSINESS_TYPE_COLORS.restaurant}, ${BUSINESS_TYPE_GRADIENT_TO.restaurant})`,
          }}
        >
          <div className="biz-card-header">
            {business.logo
              ? <img src={business.logo} alt={business.name} className="biz-logo" />
              : <div className="biz-logo-placeholder">{business.name?.[0]}</div>
            }
          </div>
          <div className="biz-card-body">
            <h1 className="eats-biz-name">{business.name}</h1>
            {business.description && <p className="eats-biz-desc">{business.description}</p>}
            {/* Hybrid (F1): the reverse bridge — ordering side → booking side.
                Booking's confirmation page offers the pre-order back-link. */}
            {business.offersBooking === true && (
              <Link to={`/index/business/${business.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: '0.85rem' }}>
                <CalendarCheck size={15} /> Book a Table
              </Link>
            )}
          </div>
        </div>

        {/* 2026-09-24: fills the space the hibernated menu left empty — the
            business's own service photos, each slide booking that table. */}
        {business.offersBooking === true && (
          <ServiceCarousel business={business} services={services} />
        )}

        {/* Menu hibernated (2026-09-11) —
        {menuItems.length === 0 ? (
          <div className="empty-state">
            <UtensilsCrossed size={40} />
            <p>Menu has not been added yet.</p>
          </div>
        ) : (
          grouped.map(([category, items]) => (
            <section key={category} className="menu-group">
              <h2 className="section-sub-title">{category}</h2>
              <div className="menu-list">
                {items.map(item => (
                  <MenuItemCard key={item.id} business={business} item={item} />
                ))}
              </div>
            </section>
          ))
        )}
        */}
      </div>

      {itemCount > 0 && cart.businessId === business.id && (
        <Link to="/qunjeeats/cart" className="eats-cart-bar">
          <span className="eats-cart-bar-count"><ShoppingCart size={16} /> {itemCount} item{itemCount > 1 ? 's' : ''}</span>
          <span className="eats-cart-bar-cta">View Cart — PKR {subtotal.toLocaleString()}</span>
        </Link>
      )}
    </div>
  );
}
