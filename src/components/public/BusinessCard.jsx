import { Link } from 'react-router-dom';
import { MapPin, Clock, ChevronRight, Utensils, Scissors, Stethoscope, Hotel, LandPlot, HeartPulse, Gem, Camera, ChefHat, Sparkles, Car, PartyPopper, GraduationCap, ParkingCircle, Palmtree } from 'lucide-react';
import { BUSINESS_TYPE_COLORS, BUSINESS_TYPE_GRADIENT_TO } from '../../utils/businessTypeColors';
import './BusinessCard.css';

const TYPE_ICONS = {
  restaurant: <Utensils size={16} />,
  salon:      <Scissors size={16} />,
  clinic:     <Stethoscope size={16} />,
  hotel:      <Hotel size={16} />,
  padel:      <LandPlot size={16} />,
  sehatkamla: <HeartPulse size={16} />,
  nayasaa:    <Gem size={16} />,
  rasoomat:   <Camera size={16} />,
  catering:   <ChefHat size={16} />,
  studyabroad: <GraduationCap size={16} />,
  makeup:     <Sparkles size={16} />,
  carrental:  <Car size={16} />,
  eventmanagement: <PartyPopper size={16} />,
  carvalet:   <ParkingCircle size={16} />,
  beachhuts:  <Palmtree size={16} />,
};
// Labels are the *service*, not the old sub-brand name — every category card
// on /index now speaks in categories/services only (Restaurants, Travel,
// HealthCare, Salon & Personal Care, Wedding, Education), not standalone
// brand names like "Nayasaa"/"Rasoomat".
const TYPE_LABELS = {
  restaurant: 'Restaurant',
  salon:      'Salon',
  clinic:     'Clinic',
  hotel:      'Hotel',
  padel:      'Padel Club',
  sehatkamla: 'HealthCare',
  nayasaa:    'Attire Rental',
  rasoomat:   'Photography',
  catering:   'Catering',
  studyabroad: 'Study Abroad',
  makeup:     'Makeup at Home',
  carrental:  'Car Rental',
  eventmanagement: 'Event Management',
  carvalet:   'Car Valet',
  beachhuts:  'Beach Huts',
};

// The whole card is one link — tapping anywhere books; the "Book Now" bar is
// just the visual affordance, not the only click target. `to`/`ctaLabel` let
// QunjeeEats reuse this exact card for its FoodVend list (linking into the
// ordering flow instead of booking) without duplicating the markup.
export default function BusinessCard({ business, to, ctaLabel = 'Book Now' }) {
  return (
    <Link to={to || `/index/business/${business.id}`} className={`biz-card type-${business.type} ${business.logo ? '' : 'no-logo'}`}
      style={{
        '--cta-color': BUSINESS_TYPE_COLORS[business.type],
        '--card-bg': business.logo
          ? `url(${business.logo})`
          : `linear-gradient(135deg, ${BUSINESS_TYPE_COLORS[business.type] || 'var(--primary)'}, ${BUSINESS_TYPE_GRADIENT_TO[business.type] || 'var(--accent)'})`,
      }}>
      <div className="biz-card-header">
        {business.logo
          ? <img src={business.logo} alt={business.name} className="biz-logo" />
          : <div className="biz-logo-placeholder">{business.name?.[0]?.toUpperCase()}</div>
        }
        {/* Temporarily hidden — <span className={`badge badge-${business.type}`}>
          {TYPE_ICONS[business.type]} {TYPE_LABELS[business.type]}
        </span> */}
      </div>

      <div className="biz-card-body">
        <h3 className="biz-name">{business.name}</h3>
        {business.description && (
          <p className="biz-desc">{business.description}</p>
        )}
        {business.address && (
          <p className="biz-address">
            <MapPin size={13} /> {business.address}
          </p>
        )}
        {business.type === 'hotel' && business.pricePerNight != null && (
          <p className="biz-price">PKR {business.pricePerNight.toLocaleString()} <span className="biz-price-unit">/ night</span></p>
        )}
        {business.type === 'nayasaa' && business.pricePerNight != null && (
          <p className="biz-price">PKR {business.pricePerNight.toLocaleString()} <span className="biz-price-unit">/ day</span></p>
        )}
      </div>

      <span className="biz-card-cta">
        {ctaLabel} <ChevronRight size={16} />
      </span>
    </Link>
  );
}
