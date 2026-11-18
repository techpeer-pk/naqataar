import { useNavigate, Link } from 'react-router-dom';
import {
  CalendarCheck, Building2, BookOpen, ChevronRight,
  Utensils, UtensilsCrossed, Scissors, HeartPulse, Gem, Shirt, Camera, Video, Hotel,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BUSINESS_TYPE_COLORS } from '../../utils/businessTypeColors';
import ShareMenu from '../../components/shared/ShareMenu';
import RegisterMenu from '../../components/shared/RegisterMenu';
import UpdatesTicker from '../../components/shared/UpdatesTicker';
import './HomePage.css';

// The Qunjee booking hub — 6 lifestyle categories replacing the old
// 11-card ecosystem-product grid (see docs/BRANDING.md's 2026-08-28 addendum
// for why: a marketing workflow diagram redefined the IA around what's
// actually bookable in-app, dropping the qunjee.com-only deep links).
// Each category is either a single destination (its own vertical page
// already lists its sub-categories) or a couple of explicit rows when the
// sub-actions land in genuinely different systems/routes.
const CATEGORIES = [
  {
    id: 'restaurant',
    name: 'Restaurant & Food',
    subtitle: 'Dining reservations',
    color: BUSINESS_TYPE_COLORS.restaurant,
    bgImage: '/category-photos/restaurant.webp',
    Icon: Utensils,
    rows: [
      { label: 'Book a Table', Icon: Utensils, href: '/restaurant-booking', iconImage: '/home-icons/book-a-table.webp' },
      { label: 'Pre-Order Food', Icon: UtensilsCrossed, href: '/qunjeeats' },
    ],
  },
  {
    id: 'salon',
    name: 'Salon & Aesthetics',
    subtitle: 'Beauty and skincare bookings',
    color: BUSINESS_TYPE_COLORS.salon,
    Icon: Scissors,
    rows: [
      { label: "Men's Salon", Icon: Scissors, href: '/index/browse?type=salon&gender=male', iconImage: '/home-icons/book-a-men-salon.webp' },
      { label: "Women's Salon", Icon: Scissors, href: '/index/browse?type=salon&gender=female', iconImage: '/home-icons/book-women-salon.webp' },
      { label: 'Booking at Skin Clinic', Icon: HeartPulse, href: '/index/browse?type=clinic&clinicType=aesthetic', iconImage: '/home-icons/book-skin-clinic.webp' },
    ],
  },
  {
    id: 'health',
    name: 'Health & Home Care',
    subtitle: 'Clinic and at-home services',
    color: BUSINESS_TYPE_COLORS.sehatkamla,
    bgImage: '/category-photos/health.webp',
    Icon: HeartPulse,
    href: '/healthcare',
  },
  {
    id: 'wedding',
    name: 'Wedding Rentals',
    subtitle: 'Bridal and groom wear',
    color: BUSINESS_TYPE_COLORS.nayasaa,
    bgImage: '/category-photos/wedding.webp',
    Icon: Gem,
    rows: [
      { label: 'Bridal Dress on Rental', Icon: Gem, href: '/nayasaa/bridal', iconImage: '/home-icons/book-bridal-dress.webp' },
      { label: 'Groom Sherwani on Rental', Icon: Shirt, href: '/nayasaa/groom' },
    ],
  },
  {
    id: 'events',
    name: 'Book for Events',
    subtitle: 'Creative professionals on demand',
    color: BUSINESS_TYPE_COLORS.rasoomat,
    Icon: Camera,
    rows: [
      { label: 'Book a Photographer', Icon: Camera, href: '/rasoomat/photography', iconImage: '/home-icons/book-a-photographer.webp' },
      { label: 'Book a Videographer', Icon: Video, href: '/rasoomat/videography' },
    ],
  },
  {
    id: 'hotels',
    name: 'Hotels & Resorts',
    subtitle: 'Stay bookings across Pakistan',
    color: BUSINESS_TYPE_COLORS.hotel,
    bgImage: '/category-photos/hotels.webp',
    Icon: Hotel,
    href: '/hotel-booking',
  },
];

function CategoryRow({ row }) {
  return (
    <Link to={row.href} className="home-category-row">
      <span className="home-category-row-icon">
        {row.iconImage
          ? <img src={row.iconImage} alt="" width={20} height={20} loading="lazy" />
          : <row.Icon size={16} />
        }
      </span>
      <span className="home-category-row-label">{row.label}</span>
      <ChevronRight size={15} className="home-category-row-chevron" />
    </Link>
  );
}

function CategoryCard({ category }) {
  const headerStyle = category.bgImage
    ? {
        backgroundImage: `linear-gradient(135deg, ${category.color}D9, ${category.color}80), url(${category.bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: category.color };

  const header = (
    <div className="home-category-header" style={headerStyle}>
      <span className="home-category-icon"><category.Icon size={22} /></span>
      <div>
        <h3 className="home-category-title">{category.name}</h3>
        <p className="home-category-subtitle">{category.subtitle}</p>
      </div>
    </div>
  );

  if (!category.rows) {
    return (
      <Link to={category.href} className="home-category-card home-category-card-link">
        {header}
      </Link>
    );
  }

  return (
    <div className="home-category-card">
      {header}
      <div className="home-category-rows">
        {category.rows.map(row => <CategoryRow key={row.label} row={row} />)}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div className="home">
      <RegisterMenu className="home-register" />
      <ShareMenu
        className="home-share"
        title="Qunjee — Book Instantly"
        text="Book appointments, restaurants, salons, hotels, clinics and more. Fast, simple, always available — powered by Qunjee."
      />
      <div className="home-inner">

        <div className="home-brand">
          <img src="/qunjee-logo.png" alt="Qunjee" className="home-brand-logo" width={1000} height={337} />
        </div>

        <div className="home-cta">
          <p className="home-cta-label">Super Lifestyle Platform</p>
          <UpdatesTicker />
          <div className="home-cards">
            {CATEGORIES.map(category => <CategoryCard key={category.id} category={category} />)}
          </div>
        </div>

        <div className="home-bottom-links">
          <button className="home-my-bookings" onClick={() => navigate('/index/my-appointments')}>
            <CalendarCheck size={14} /> My Bookings
          </button>
          {!isAdmin && (
            <button className="home-my-bookings" onClick={() => navigate('/admin/register')}>
              <Building2 size={14} /> Register Business
            </button>
          )}
          <button className="home-my-bookings" onClick={() => navigate('/documentation')}>
            <BookOpen size={14} /> Documentation
          </button>
        </div>

      </div>
    </div>
  );
}
