import { Link } from 'react-router-dom';
import { Heart, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Footer.css';

// Only the one link cluster the Navbar doesn't already cover — everything
// else here (Browse, My Bookings, Sign In, type filters) duplicated primary
// nav and just added scroll weight, especially in the PWA's app-like pages.
const BUSINESS_LINKS_GUEST = [
  { label: 'Business Login',    to: '/admin/login' },
  { label: 'Register Business', to: '/admin/register' },
];

const BUSINESS_LINKS_ADMIN = [
  { label: 'Dashboard',    to: '/admin/dashboard' },
  { label: 'Appointments', to: '/admin/appointments' },
];

export default function Footer({ hasBottomNav = false }) {
  const { isAdmin } = useAuth();
  const year = new Date().getFullYear();
  const businessLinks = isAdmin ? BUSINESS_LINKS_ADMIN : BUSINESS_LINKS_GUEST;

  return (
    <footer className={`footer${hasBottomNav ? ' footer-with-bottom-nav' : ''}`}>
      <div className="footer-wave">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none">
          {/* <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#0D1B3E" /> */}
          {/* 2026-11-17 Qufree teal footer */}
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" fill="#123F4C" />
        </svg>
      </div>

      <div className="footer-body">
        <div className="footer-brand-section">
          <div className="footer-brand">
            {/* <img src="/qunjee-logo-white.png" alt="Qunjee" className="footer-logo-img" width={1000} height={337} /> */}
            {/* <img src="/qufree-logo-white.png" alt="Qufree" className="footer-logo-img" width={987} height={295} /> */}
            <img src="/brand/naqatar-lockup-white.png" alt="Naqatar" className="footer-logo-img" width={522} height={160} />
          </div>
          {/* <p className="footer-tagline">
            Instant booking for <em>Restaurant reservation, Salons &amp; Spa
            Booking, Doctor Appointments &amp; Hotel Rooms</em>
          </p> */}
          {/* 2026-11-17 Qufree rebrand */}
          <p className="footer-tagline">
            Find any clinic by its number and <em>book instantly</em>.
          </p>
          <div className="footer-contact">
            {/* <span><Mail size={14} /> hello@qunjee.com</span> */}
            {/* 2026-11-17: no public email for Qufree yet (user decision) — point to the in-app Help chat. */}
            {/* <span><Mail size={14} /> Help &amp; support chat in the app</span> */}
            <span><Mail size={14} /> <a href="mailto:techpeer.pk@gmail.com" className="footer-link">techpeer.pk@gmail.com</a></span>
          </div>
        </div>

        <div className="footer-col">
          <h4 className="footer-col-title">For Businesses</h4>
          <ul className="footer-inline-links">
            {businessLinks.map(item => (
              <li key={item.label}>
                <Link to={item.to} className="footer-link">{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p className="footer-copy">
            {/* © {year} Qunjee. Built with <Heart size={12} fill="currentColor" /> by{' '} */}
            © {year} Naqatar. Built with <Heart size={12} fill="currentColor" /> by{' '}
            {/* <a href="https://qunjee-com.web.app/index/browse" target="_blank" rel="noopener noreferrer" className="footer-link"> */}
            {/* 2026-11-17: qunjee-com now serves a static 404 → link the live app instead. */}
            {/* <a href="https://qufree.web.app/" target="_blank" rel="noopener noreferrer" className="footer-link">
              Qufree
            </a> */}
            {/* 2026-11-17: "© Qufree … by Qufree" repeated itself — credit the operator (as in Terms/Privacy). */}
            <span className="footer-maker">TechPeer</span>
          </p>
          <div className="footer-legal-links">
            {/* 2026-11-17: hidden — /documentation still describes Qunjee (categories, QunjeeEats).
                Re-enable once it's rewritten for Qufree. */}
            {/* <Link to="/documentation" className="footer-link">Documentation</Link> */}
            <Link to="/terms" className="footer-link">Terms of Service</Link>
            <Link to="/privacy" className="footer-link">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
