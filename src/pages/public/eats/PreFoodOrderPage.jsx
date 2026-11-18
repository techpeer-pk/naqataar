import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, UtensilsCrossed, CalendarCheck, AlertTriangle } from 'lucide-react';
import { useBusinesses } from '../../../hooks/useBusinesses';
import { useMenuItems } from '../../../hooks/useMenuItems';
import { useAppointments } from '../../../hooks/useAppointments';
import { useCart } from '../../../context/CartContext';
import { BUSINESS_TYPE_COLORS, BUSINESS_TYPE_GRADIENT_TO } from '../../../utils/businessTypeColors';
import { formatTime12h } from '../../../utils/format';
import MenuItemCard from '../../../components/eats/MenuItemCard';
import Sk from '../../../components/shared/Skeleton';
import '../../../components/public/BusinessCard.css';
import './EatsBusinessPage.css';

/**
 * Pre-Food Order (PFO) — F1 dine-in pre-order, always tied to a real
 * appointment via ?appt=<appointmentId>. Separate from EatsBusinessPage.jsx
 * (general Eats browsing/delivery/pickup — Menu hibernated 2026-09-11): this
 * page never works as a standalone browsable menu, only as a deep link
 * reached from ConfirmationPage.jsx's "Pre-order Food" button or a resend of
 * that link — no ?appt, or one that doesn't match, means no menu.
 */
export default function PreFoodOrderPage() {
  const { businessId } = useParams();
  const [searchParams] = useSearchParams();
  const apptId = searchParams.get('appt');
  const navigate = useNavigate();

  const { fetchOne: fetchBusiness }    = useBusinesses();
  const { fetchOne: fetchAppointment } = useAppointments();
  const { menuItems, fetchAll }        = useMenuItems(businessId);
  const { cart, itemCount, subtotal, startDineInOrder } = useCart();

  const [business, setBusiness] = useState(null);
  const [appt, setAppt]         = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!apptId) { setLoading(false); return; }
    Promise.all([
      fetchBusiness(businessId).then(setBusiness),
      fetchAppointment(apptId).then(setAppt),
      fetchAll(),
    ]).finally(() => setLoading(false));
  }, [businessId, apptId]);

  // Seed the cart's dine-in context from the fetched appointment — same shape
  // ConfirmationPage.jsx's handlePreOrder builds, just sourced from Firestore
  // instead of route state so this page works as a standalone deep link.
  useEffect(() => {
    if (!business || !appt || appt.businessId !== business.id) return;
    const scheduledFor = appt.appointmentDatetime?.toDate
      ? appt.appointmentDatetime.toDate().toISOString()
      : null;
    startDineInOrder(
      { id: business.id, name: business.name },
      {
        appointmentId:  appt.id,
        scheduledFor,
        date:           appt.date,
        time:           appt.time,
        customerName:   appt.customerName,
        customerPhone:  appt.customerPhone,
        customerEmail:  appt.customerEmail,
      }
    );
  }, [business?.id, appt?.id]);

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
      </div>
    );
  }

  const invalid = !business || !appt || appt.businessId !== business.id || business.offersOrdering !== true;

  if (invalid) {
    return (
      <div className="container page">
        <div className="empty-state">
          <AlertTriangle size={40} />
          <p>This pre-order link isn't valid — book a table first to pre-order food.</p>
          {/* Changed 2026-09-11 (was to="/index/browse"): <Link to="/index/browse" className="btn btn-primary">Browse Restaurants</Link> */}
          <Link to="/qunjeeats" className="btn btn-primary">Browse Restaurants</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="eats-biz page">
      <div className="container">
        <button type="button" onClick={() => navigate(-1)} className="back-link"><ChevronLeft size={16} /> Back</button>

        <div className="card" style={{ marginBottom: '1rem', background: '#FFF7ED', border: '1px solid #FDBA74' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9A3412', fontSize: '0.9rem' }}>
            <UtensilsCrossed size={16} />
            <span>
              Pre-ordering for your booking — <strong>{appt.date}, {formatTime12h(appt.time)}</strong>.
              Add dishes and check out; your food will be ready when you arrive.
            </span>
          </div>
        </div>

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
            <Link to={`/index/my-appointments?appt=${appt.id}`} className="btn btn-ghost btn-sm" style={{ marginTop: '0.85rem' }}>
              <CalendarCheck size={15} /> View Booking
            </Link>
          </div>
        </div>

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
