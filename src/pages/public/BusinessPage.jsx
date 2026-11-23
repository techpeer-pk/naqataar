import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, ChevronLeft, Utensils, Scissors, Stethoscope, Hotel, HeartPulse, Gem, Camera, User, X, ZoomIn, Palmtree, ShoppingCart } from 'lucide-react';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useServices } from '../../hooks/useServices';
import { useCart } from '../../context/CartContext';
import { formatTime12h } from '../../utils/format';
import { allowsToken, allowsBooking } from '../../utils/dots';
import Sk from '../../components/shared/Skeleton';
import './BusinessPage.css';
import './eats/EatsBusinessPage.css';
import { t } from '../../i18n';

function BusinessPageSkeleton() {
  return (
    <div className="biz-page page">
      <div className="container">
        <Sk w="80px" h="1rem" r="4px" mb="1.5rem" />
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body biz-header-inner" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
              <Sk w="72px" h="72px" r="14px" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Sk w="60px" h="22px" r="999px" />
                <Sk w="55%" h="1.6rem" />
                <Sk w="80%" h="0.85rem" />
              </div>
            </div>
            <Sk w="140px" h="42px" r="8px" />
          </div>
        </div>
        <div className="biz-content-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Sk w="100px" h="1.1rem" mb="0.25rem" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card">
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    <Sk w="45%" h="1rem" />
                    <Sk w="65%" h="0.8rem" />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Sk w="60px" h="0.85rem" />
                    <Sk w="70px" h="0.85rem" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card"><div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <Sk w="120px" h="1rem" mb="0.25rem" />
              {Array.from({ length: 3 }).map((_, i) => <Sk key={i} h="0.85rem" w={`${60 + i * 10}%`} />)}
            </div></div>
            <div className="card"><div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Sk w="120px" h="1rem" mb="0.25rem" />
              {Array.from({ length: 7 }).map((_, i) => <Sk key={i} h="0.8rem" />)}
            </div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TYPE_ICONS = { restaurant: <Utensils size={20} />, salon: <Scissors size={20} />, clinic: <Stethoscope size={20} />, hotel: <Hotel size={20} />, sehatkamla: <HeartPulse size={20} />, nayasaa: <Gem size={20} />, rasoomat: <Camera size={20} />, beachhuts: <Palmtree size={20} /> };
// This page only ever lists bookable options (table sizes, appointment
// services) — never a food menu — so "Menu" here was misleading regardless
// of business type.
const TYPE_SERVICE_LABEL = { restaurant: 'Reserve a Table', salon: 'Services', clinic: 'Services', sehatkamla: 'Services', hotel: 'Room Types', nayasaa: 'Outfits', rasoomat: 'Services', beachhuts: 'Huts' };
const TYPE_BOOK_CTA = { restaurant: 'Reserve a Table', salon: 'Book Appointment', clinic: 'Book Appointment', hotel: 'Book a Room', sehatkamla: 'Book a Visit', nayasaa: 'Rent Now', rasoomat: 'Book Appointment', beachhuts: 'Book a Hut' };
const DAY_FULL = { mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday' };
// Object.entries(workingHours) followed Firestore's stored key order, which
// isn't guaranteed to be Monday-first for every business (older docs, manual
// edits) — this fixed order makes the display consistent for all of them.
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DESC_CLAMP_THRESHOLD = 150;

// Business types that book a pool of named items by date range (rooms,
// outfits) rather than appointment slots — each gets its own booking route
// and unit/price wording. Kept in sync with AdminRegister.jsx/ServicesPage.jsx.
const POOL_BOOKING_TYPES = ['hotel', 'nayasaa', 'beachhuts'];
const POOL_TYPE_META = {
  hotel:     { bookingPath: '/bookinghotels', bookingParam: 'room',   unitSuffix: 'room', priceUnit: ' / night' },
  nayasaa:   { bookingPath: '/nayasaa-booking', bookingParam: 'outfit', unitSuffix: 'unit', priceUnit: ' / day' },
  // beachhuts: { bookingPath: '/beachhuts-booking', bookingParam: 'hut', unitSuffix: 'hut', priceUnit: ' / night' },
  // Beach Huts priced per day, not per night (2026-09-24)
  beachhuts: { bookingPath: '/beachhuts-booking', bookingParam: 'hut', unitSuffix: 'hut', priceUnit: ' / day' },
};

export default function BusinessPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { fetchOne }  = useBusinesses();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [lightboxService, setLightboxService] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const { services, fetchAll }  = useServices(id);
  // A cart started on /pfo (dine-in pre-order) had no way back once the
  // customer left that page — surface it here too, same bar as /pfo.
  const { cart, itemCount, subtotal } = useCart();
  const showCartBar = itemCount > 0 && cart.businessId === id;

  useEffect(() => {
    Promise.all([
      fetchOne(id).then(b => setBusiness(b)),
      fetchAll(),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <BusinessPageSkeleton />;
  if (!business) return <div className="container page"><p>{t('Clinic not found.')}</p></div>;

  return (
    <div className={`biz-page page${showCartBar ? ' has-cart-bar' : ''}`}>
      <div className="container">
        <button type="button" onClick={() => navigate(-1)} className="back-link"><ChevronLeft size={16} /> {t('Back')}</button>

        {/* Header */}
        <div className="biz-header card">
          {/* <div className="card-body biz-header-inner"> */}
          {/* 2026-11-17: the business's own logo (Firestore business.logo) as a
              faint header background — see .biz-header-inner.has-logo-bg in
              BusinessPage.css. No logo → Qufree mark watermark instead. */}
          <div
            className={`card-body biz-header-inner${business.logo ? ' has-logo-bg' : ''}`}
            style={business.logo ? { '--biz-bg': `url("${business.logo}")` } : undefined}
          >
            <div className="biz-header-info">
              {business.logo
                ? <img src={business.logo} alt={business.name} className="biz-hero-logo" />
                : <div className="biz-hero-logo biz-logo-fallback">{business.name?.[0]}</div>
              }
              <div>
                {/* Temporarily hidden — <div className={`badge badge-${business.type} mb-1`}>
                  {TYPE_ICONS[business.type]} {business.type}
                </div> */}
                <h1 className="biz-hero-name">{business.name}</h1>
                {business.description && (
                  <>
                    <p className={`biz-hero-desc${descExpanded ? '' : ' clamped'}`}>{business.description}</p>
                    {business.description.length > DESC_CLAMP_THRESHOLD && (
                      <button
                        type="button"
                        className="biz-desc-toggle"
                        onClick={() => setDescExpanded(v => !v)}
                      >
                        {descExpanded ? t('Show less') : t('Read more')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* Hidden once a pool-booking business (hotel/nayasaa) has its own
                item docs — this generic link carries no item param, and the
                per-item "Book"/"Rent" buttons below already cover booking in
                that case. Bypassing them here would let a guest land on the
                booking flow with no room/outfit selected. */}
            {/* 2026-11-23: buttons follow the clinic's visitMode (/admin/profile). */}
            <div className="biz-cta-group">
            {allowsBooking(business) && !(POOL_BOOKING_TYPES.includes(business.type) && services.length > 0) && (
              <Link to={POOL_TYPE_META[business.type] ? `${POOL_TYPE_META[business.type].bookingPath}/${id}` : `/index/booking/${id}`} className="btn btn-primary btn-book-now">
                {t(TYPE_BOOK_CTA[business.type] || 'Book Appointment')}
              </Link>
            )}
            {allowsToken(business) && (
              <Link to={`/index/businessDOTS/${id}`} className={`btn ${allowsBooking(business) ? 'btn-secondary' : 'btn-primary'} btn-book-now`}>
                {t('Get Token')}
              </Link>
            )}
            </div>
          </div>
        </div>

        <div className="biz-content-grid">
          {/* A hotel/nayasaa business with no item docs yet still rides the
              flat-price/pool flow at its POOL_TYPE_META bookingPath — show
              per-night/per-day pricing here instead, since it was otherwise
              invisible until the guest picked dates on the booking page.
              Once it has item docs, this falls through to the same list
              rendering every other business type already uses below. */}
          {POOL_BOOKING_TYPES.includes(business.type) && services.length === 0 ? (
          <div className="card hotel-price-card">
            <div className="card-header"><h3>Pricing</h3></div>
            <div className="card-body">
              {business.pricePerNight != null
                ? <p className="hotel-price-value">PKR {business.pricePerNight.toLocaleString()} <span className="hotel-price-unit">{POOL_TYPE_META[business.type].priceUnit}</span></p>
                : <p className="text-muted">Pricing not set yet.</p>
              }
              {business.totalRooms && (
                <p className="text-muted">{business.totalRooms} {POOL_TYPE_META[business.type].unitSuffix}{business.totalRooms > 1 ? 's' : ''} available</p>
              )}
            </div>
          </div>
          ) : (
          <div>
            <h2 className="section-sub-title">{t(TYPE_SERVICE_LABEL[business.type])}</h2>
            {services.length === 0
              ? <p className="text-muted">{t('No services listed yet.')}</p>
              : (
                <div className="services-list">
                  {services.map(s => (
                    <div key={s.id} className="service-row card">
                      <div className="card-body service-row-inner">
                        <div className="service-thumb-col">
                          {s.image
                            ? (
                              <div className="service-photo-wrap" onClick={() => setLightboxService(s)}>
                                <img
                                  src={s.image}
                                  alt={s.name}
                                  className="service-photo"
                                />
                                <span className="zoom-badge"><ZoomIn size={11} /> {t('Zoom')}</span>
                              </div>
                            )
                            : <div className="service-photo service-photo-placeholder"><User size={16} /></div>
                          }
                          {s.onTop && <span className="badge badge-promo">{t('Promo')}</span>}
                        </div>
                        <div className="service-row-body">
                          <div className="service-row-info">
                            <p className="service-name">{s.name}</p>
                            {s.description && <p className="service-desc">{s.description}</p>}
                          </div>
                          <div className="service-meta">
                            <span className="service-meta-left">
                              {POOL_BOOKING_TYPES.includes(business.type)
                                ? <span className="service-duration">{s.totalRooms || 1} {POOL_TYPE_META[business.type].unitSuffix}{(s.totalRooms || 1) > 1 ? 's' : ''}</span>
                                : (s.duration && <span className="service-duration"><Clock size={13} /> {t('{n} min', { n: s.duration })}</span>)
                              }
                              {s.price && <span className="service-price">PKR {s.price.toLocaleString()}{POOL_TYPE_META[business.type]?.priceUnit || ''}</span>}
                            </span>
                            {allowsBooking(business) && (
                            <Link
                              to={POOL_TYPE_META[business.type] ? `${POOL_TYPE_META[business.type].bookingPath}/${id}?${POOL_TYPE_META[business.type].bookingParam}=${s.id}` : `/index/booking/${id}?service=${s.id}`}
                              className="btn btn-primary btn-sm service-book-btn"
                            >
                              {t(business.type === 'nayasaa' ? 'Rent' : 'Book')}
                            </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
          )}

          {lightboxService && createPortal(
            <div className="service-lightbox-overlay" onClick={() => setLightboxService(null)}>
              <button type="button" className="service-lightbox-close" onClick={() => setLightboxService(null)}>
                <X size={22} />
              </button>
              <img
                src={lightboxService.image}
                alt={lightboxService.name}
                className="service-lightbox-img"
                onClick={e => e.stopPropagation()}
              />
              <p className="service-lightbox-caption">{lightboxService.name}</p>
            </div>,
            document.body
          )}

          {/* Info panel */}
          <div className="biz-info-panel">
            {business.workingHours && business.showWorkingHours !== false && (
              <div className="card">
                <div className="card-header"><h3>{t('Working Hours')}</h3></div>
                <div className="card-body">
                  {DAY_ORDER.map(day => {
                    const hours = business.workingHours[day];
                    return (
                      <div key={day} className="hours-row">
                        <span className="hours-day">{t(DAY_FULL[day] || day)}</span>
                        <span className="hours-time">
                          {hours?.open ? `${formatTime12h(hours.open)} – ${formatTime12h(hours.close)}` : t('Closed')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCartBar && (
        <Link to="/qunjeeats/cart" className="eats-cart-bar">
          <span className="eats-cart-bar-count"><ShoppingCart size={16} /> {itemCount} item{itemCount > 1 ? 's' : ''}</span>
          <span className="eats-cart-bar-cta">View Cart — PKR {subtotal.toLocaleString()}</span>
        </Link>
      )}
    </div>
  );
}
