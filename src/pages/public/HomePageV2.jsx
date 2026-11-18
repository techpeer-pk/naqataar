import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarCheck, Building2, BookOpen, ArrowRight, PlayCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCategoryVisibility } from '../../hooks/useCategoryVisibility';
import ShareMenu from '../../components/shared/ShareMenu';
import RegisterMenu from '../../components/shared/RegisterMenu';
import UpdatesTicker from '../../components/shared/UpdatesTicker';
import AdBannerStrip from '../../components/public/AdBannerStrip';
import HowToUseModal from '../../components/public/HowToUseModal';
import Sk from '../../components/shared/Skeleton';
import './HomePage.css';
import './HomePageV2.css';

// Mirrors qunjee.com's own "Explore Our Categories" card-grid section
// (Shopify section id cro-card-grid-template--16496016425042__cro_card_grid_xAef3N)
// styling-wise: same card anatomy (photo, title, one-line description, pill
// button with a hover-slide arrow), same copy, same 3/2/1-column breakpoints.
// Buttons route into the real in-app destination for each category instead
// of qunjee.com's own placeholder "#" links.
const CATEGORIES = [
  {
    id: 'restaurants',
    title: 'Restaurants',
    description: 'Book the best restaurants & avail pre food delivery option',
    image: '/category-photos/restaurant.webp',
    cta: 'Book Now',
    href: '/index/restaurants',
  },
  {
    id: 'entertainment',
    title: 'Entertainment',
    description: 'Book padel courts & entertainment venues',
    image: '/category-photos/entertainment.webp',
    cta: 'Book Now',
    href: '/index/entertainment',
  },
  {
    id: 'travel',
    title: 'Travel',
    description: 'Book Hotels, Resorts & Airport pickup',
    image: '/category-photos/travel.webp',
    cta: 'Book Now',
    href: '/index/travel',
  },
  {
    id: 'healthcare',
    title: 'HealthCare',
    description: 'Book HealthCare Services',
    image: '/category-photos/health.webp',
    cta: 'Book Now',
    href: '/index/healthcare',
  },
  {
    id: 'salon',
    title: 'Salon & Personal Care',
    description: 'Book Beauty & Grooming Services',
    image: '/category-photos/salon.webp',
    cta: 'Book Now',
    href: '/index/salon',
  },
  {
    id: 'wedding',
    title: 'Wedding',
    description: 'Book the best services for wedding and your events',
    image: '/category-photos/wedding.webp',
    cta: 'Book Now',
    href: '/index/wedding',
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Explore Education Services',
    image: '/category-photos/education.webp',
    cta: 'Explore Now',
    href: '/index/education',
  },
];

function CategoryCard({ category }) {
  const disabled = !category.href;

  return (
    <article className="cro-card">
      {disabled ? (
        <div className="cro-card-image-wrapper">
          {category.image
            ? <img src={category.image} alt={category.title} className="cro-card-image" loading="lazy" />
            : <div className="cro-card-placeholder" />
          }
        </div>
      ) : (
        <Link to={category.href} className="cro-card-image-link" aria-label={category.title}>
          <div className="cro-card-image-wrapper">
            {category.image
              ? <img src={category.image} alt={category.title} className="cro-card-image" loading="lazy" />
              : <div className="cro-card-placeholder" />
            }
          </div>
        </Link>
      )}

      <div className="cro-card-content">
        <h3 className="cro-card-title">
          {disabled ? category.title : <Link to={category.href}>{category.title}</Link>}
        </h3>
        <p className="cro-card-description">{category.description}</p>
        {disabled ? (
          <span className="cro-card-button cro-card-button-disabled">
            <span>Coming Soon</span>
          </span>
        ) : (
          <Link to={category.href} className="cro-card-button">
            <span>{category.cta}</span>
            <ArrowRight size={18} />
          </Link>
        )}
      </div>
    </article>
  );
}

export default function HomePageV2() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [showHowTo, setShowHowTo] = useState(false);
  const { order, hidden, loading: categoriesLoading } = useCategoryVisibility();

  // `order` only ever reorders — a category missing from it (new in code,
  // never touched from /superadmin/ads yet) is appended at the end instead
  // of disappearing. `hidden` filters it out entirely.
  const visibleCategories = [
    ...order.map(id => CATEGORIES.find(c => c.id === id)).filter(Boolean),
    ...CATEGORIES.filter(c => !order.includes(c.id)),
  ].filter(c => !hidden.includes(c.id));

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
          <p className="home-cta-label">Welcome to Qunjee | Pakistan's First Services Booking Platform - Restaurants . Salons . Hotels . Health</p>
          <UpdatesTicker />

          <AdBannerStrip placement="home" />

          <div className="cro-card-grid-header">
            <h2 className="cro-card-grid-heading">Explore Our Categories</h2>
            <p className="cro-card-grid-description">Discover our services</p>
          </div>

          <div className="how-to-use-wrap">
            <button className="how-to-use-btn" onClick={() => setShowHowTo(true)}>
              <PlayCircle size={16} /> How to use Qunjee
            </button>
          </div>

          <div className="cro-card-grid">
            {categoriesLoading
              // Only the very first visit ever (no module cache, no
              // localStorage) hits this — shows a skeleton in the default
              // hardcoded order's slot count instead of rendering that
              // default order and then re-rendering in the real order a
              // moment later, which is what caused the visible "jerk".
              ? CATEGORIES.map(category => (
                  <article className="cro-card" key={category.id}>
                    <div className="cro-card-image-wrapper"><Sk h="100%" r="0" /></div>
                    <div className="cro-card-content">
                      <Sk w="60%" h="1.1rem" mb="0.5rem" />
                      <Sk w="90%" h="0.85rem" mb="0.9rem" />
                      <Sk w="120px" h="2.2rem" r="999px" />
                    </div>
                  </article>
                ))
              : visibleCategories.map(category => <CategoryCard key={category.id} category={category} />)}
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

      {showHowTo && <HowToUseModal onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
