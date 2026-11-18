import { useParams, Link, Navigate } from 'react-router-dom';
import { Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import AdBannerStrip from '../../components/public/AdBannerStrip';
import { useCategoryVisibility } from '../../hooks/useCategoryVisibility';
import './CategoryActionsPage.css';

// Intermediate "pick an action" page between /index's category cards and
// the actual booking/browse destination. Tapping a category card on /index
// lands here first; each category shows its own small set of sub-actions as
// a responsive flex icon grid instead of jumping straight to one page.
// Actions with no `href` (no in-app feature built yet) render disabled.
// Actions with no custom icon yet (see the icon-inventory memory — 1 of the
// 23 sub-actions across all categories has no sourced icon) fall back to a
// plain placeholder glyph rather than guessing a "close enough" lucide icon.
const CATEGORY_ACTIONS = {
  restaurants: {
    title: 'Restaurants',
    actions: [
      { label: 'Book a Table', iconImage: '/home-icons/book-a-table.webp', href: '/qunjeeats' },
    ],
  },
  travel: {
    title: 'Travel',
    actions: [
      { label: 'Online Tickets', iconImage: '/home-icons/book-airline-ticket.webp', href: null },
      { label: 'Hotel Bookings', iconImage: '/home-icons/book-a-hotel.webp', href: '/hotel-booking' },
      { label: 'Resort Bookings', iconImage: '/home-icons/book-resorts.webp', href: '/hotel-booking' },
      { label: 'Airport Pickup', iconImage: '/home-icons/airport-pickup.webp', href: null },
    ],
  },
  healthcare: {
    title: 'HealthCare',
    actions: [
      { label: 'Clinic Appointment', iconImage: '/home-icons/clinic-appointment.webp', href: '/index/browse?type=clinic&clinicType=medical' },
      { label: 'Doctor at Home', iconImage: '/home-icons/doctor-at-home.webp', href: '/healthcare/doctor-home' },
      { label: 'Blood Test at Home', iconImage: '/home-icons/blood-test-at-home.webp', href: '/healthcare/blood-test' },
      { label: 'X-ray at Home', iconImage: '/home-icons/xray-at-home.webp', href: '/healthcare/xray-home' },
      { label: 'Physiotherapist at Home', iconImage: '/home-icons/book-a-physiotherapist.webp', href: '/healthcare/physiotherapy' },
      { label: 'Medicine Consultancy', iconImage: '/home-icons/medicine-consultancy.webp', href: '/healthcare/medicine-consultancy' },
    ],
  },
  salon: {
    title: 'Salon & Personal Care',
    actions: [
      { label: "Men's Salon", iconImage: '/home-icons/book-a-men-salon.webp', href: '/index/browse?type=salon&gender=male' },
      { label: "Women's Salon", iconImage: '/home-icons/book-women-salon.webp', href: '/index/browse?type=salon&gender=female' },
      { label: 'Aesthetic Clinic', iconImage: '/home-icons/book-skin-clinic.webp', href: '/index/browse?type=clinic&clinicType=aesthetic' },
    ],
  },
  wedding: {
    title: 'Wedding',
    actions: [
      { label: 'Wedding Dress on Rental', iconImage: '/home-icons/book-bridal-dress.webp', href: '/nayasaa/bridal' },
      { label: 'Book a Photographer', iconImage: '/home-icons/book-a-photographer.webp', href: '/rasoomat/photography' },
      { label: 'Event Management', iconImage: '/home-icons/event-management.webp', href: '/index/browse?type=eventmanagement' },
      { label: 'Caterers', iconImage: '/home-icons/book-a-caterer.webp', href: '/index/browse?type=catering' },
      { label: 'Makeup at Home', iconImage: '/home-icons/makeup-at-home.webp', href: '/index/browse?type=makeup' },
      { label: 'Wedding Car Rental', iconImage: '/home-icons/wedding-car-rental.webp', href: '/index/browse?type=carrental' },
      { label: 'Car Valet', iconImage: '/home-icons/car-valet.webp', href: '/index/browse?type=carvalet' },
    ],
  },
  education: {
    title: 'Education',
    actions: [
      { label: 'School Advisory', iconImage: '/home-icons/school-advisory.webp', href: null },
      { label: 'Career Counselling', iconImage: '/home-icons/career-counselling.webp', href: null },
      { label: 'Study Abroad Consultation', iconImage: '/home-icons/study-abroad-consultation.webp', href: '/index/browse?type=studyabroad' },
      { label: 'University Admission Tests', iconImage: '/home-icons/university-admission-tests.webp', href: null },
    ],
  },
  entertainment: {
    title: 'Entertainment',
    actions: [
      { label: 'Padel Court Booking', iconImage: '/home-icons/padel-court.webp', href: '/index/browse?type=padel' },
      { label: 'Beach Huts', iconImage: '/home-icons/beach-huts.webp', href: '/index/browse?type=beachhuts' },
    ],
  },
};

function ActionTile({ action }) {
  const disabled = !action.href;
  // Icon area mirrors the /index category cards: same 4/3 box, same
  // object-fit: cover fill — no floating icon in a sea of white space.
  const content = (
    <>
      <div className="cat-action-icon-wrap">
        {action.iconImage
          ? <img src={action.iconImage} alt="" className="cat-action-icon-img" loading="lazy" />
          : <div className="cat-action-icon-placeholder"><Circle size={28} strokeWidth={1.5} /></div>
        }
      </div>
      <div className="cat-action-content">
        <span className="cat-action-label">{action.label}</span>
        {disabled && <span className="cat-action-badge">Coming Soon</span>}
      </div>
    </>
  );

  return disabled
    ? <button type="button" className="cat-action-tile is-disabled" onClick={() => toast('Coming Soon!')}>{content}</button>
    : <Link to={action.href} className="cat-action-tile">{content}</Link>;
}

export default function CategoryActionsPage() {
  const { category } = useParams();
  const data = CATEGORY_ACTIONS[category];
  const { hidden, loading } = useCategoryVisibility();

  // Waits for the config to actually load before deciding — same brief
  // "flash before it catches up" the shutdown gate already accepts
  // elsewhere, not a new tradeoff.
  if (!data || (!loading && hidden.includes(category))) return <Navigate to="/index" replace />;

  return (
    <div className="cat-actions">
      <div className="cat-actions-inner">
        <Link to="/index" className="cat-actions-back">← Back to Categories</Link>
        <h1 className="cat-actions-title">{data.title}</h1>

        <AdBannerStrip placement={category} />

        <div className="cat-actions-grid">
          {data.actions.map(action => <ActionTile key={action.label} action={action} />)}
        </div>
      </div>
    </div>
  );
}
