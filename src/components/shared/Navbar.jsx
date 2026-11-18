import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOwnBusiness } from '../../hooks/useOwnBusiness';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import {
  CalendarCheck, Menu, X, User, LogOut,
  LayoutDashboard, BookOpen, Settings, ChevronDown, UserCircle,
  UtensilsCrossed, ClipboardList, Receipt, HeartPulse, Gem, Camera, Home, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ShareMenu from './ShareMenu';
import './Navbar.css';

// 2026-11-17: general share link for the app (user-specified), the same on
// every page — "/" redirects to /find-business.
const APP_SHARE_URL = 'https://qufree.web.app/';

export default function Navbar() {
  const { user, userProfile, isCustomer, logout } = useAuth();
  // Resolves to the businessAdmin's own business (null for everyone else) —
  // drives the F2 Menu/Orders links for owner-managed vendors.
  const { business: ownBusiness } = useOwnBusiness();
  const ownsEats = ownBusiness?.offersOrdering === true;
  // Notifications are only ever logged for customers (bookings/orders), see
  // functions/index.js's logNotification — businessAdmin has no personal
  // notification history, so don't subscribe for that dropdown.
  const unreadCount = useUnreadNotificationCount(isCustomer ? user?.uid : null);
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen]         = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isAdminRoute  = pathname.startsWith('/admin');
  // /bookinghotels and /hotel-booking are top-level siblings of /index (not
  // nested under it), but both are customer-facing pages that need the same
  // shell (Browse link, sign-in, My Bookings) as everything else under /index.
  // "/" is the same HomePage as "/index" (see App.jsx routes) but isn't
  // itself prefixed by "/index", so it needs its own explicit check.
  // const isPublicRoute = pathname === '/' || pathname.startsWith('/index') || pathname.startsWith('/bookinghotels') || pathname.startsWith('/hotel-booking') || pathname.startsWith('/restaurant-booking') || pathname.startsWith('/beachhuts-booking');
  // 2026-11-17: + /find-business — "/" and "/index" now redirect there (App.jsx).
  const isPublicRoute = pathname === '/' || pathname === '/find-business' || pathname.startsWith('/index') || pathname.startsWith('/bookinghotels') || pathname.startsWith('/hotel-booking') || pathname.startsWith('/restaurant-booking') || pathname.startsWith('/beachhuts-booking');
  const isEatsRoute   = pathname.startsWith('/qunjeeats');
  // HealthCare is a peer sub-brand too — same isolation as QunjeeEats (see
  // BRANDING.md §6), just its own category-grid + multi-vendor booking
  // instead of a food-ordering flow. Route is /healthcare; Firestore's
  // business type value underneath stays 'sehatkamla' (see CLAUDE.md).
  const isSehatRoute  = pathname.startsWith('/healthcare');
  // Nayasaa is a peer sub-brand too, same isolation as HealthCare/QunjeeEats
  // — own category-grid + attire-rental booking instead of appointments.
  // startsWith('/nayasaa') also covers /nayasaa-booking, a deliberate top-level
  // sibling path (see App.jsx), same pattern as /bookinghotels vs /hotel-booking.
  const isNayasaaRoute = pathname.startsWith('/nayasaa');
  // Rasoomat (photography/videography) — plain appointment-slot booking
  // like salon/clinic, not a pool-booking type, so isHotelAdmin below is
  // NOT widened for it (its admin nav stays the normal Appointments/Services
  // pair). Only the route-detection/nav-link isolation is mirrored.
  const isRasoomatRoute = pathname.startsWith('/rasoomat');
  // Widened (not renamed) to keep this diff minimal — for type === 'hotel'
  // the boolean is unchanged, nayasaa/beachhuts just get the same nav treatment
  // (all three are pool-booking types with a "Rooms"/"Outfits"/"Huts" admin nav item).
  const isHotelAdmin  = ownBusiness?.type === 'hotel' || ownBusiness?.type === 'nayasaa' || ownBusiness?.type === 'beachhuts';
  const roomsNavLabel = ownBusiness?.type === 'nayasaa' ? 'Rentals' : ownBusiness?.type === 'beachhuts' ? 'Huts' : 'Rooms';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/index');
  };

  if (!isAdminRoute && !isPublicRoute && !isEatsRoute && !isSehatRoute && !isNayasaaRoute && !isRasoomatRoute) return null;

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Brand — reverted 2026-08-31 from the per-sub-brand "peers, not
            nested" split documented in BRANDING.md §6 (itself a same-day
            correction of an earlier "replace everywhere" attempt on
            2026-07-16). User explicitly re-confirmed wanting one Qunjee
            mark across the whole app, aware of that history — every route
            now shows the same logo regardless of sub-brand. */}
        <Link
          to={isAdminRoute ? '/admin/dashboard' : isEatsRoute ? '/qunjeeats' : isSehatRoute ? '/index/healthcare' : isNayasaaRoute ? '/index/wedding' : isRasoomatRoute ? '/index/wedding' : '/index'}
          className="navbar-brand"
        >
          {/* <img src="/qunjee-logo.png" alt="Qunjee" className="navbar-logo-img" /> */}
          {/* <img src="/qufree-logo.png" alt="Qufree" className="navbar-logo-img" /> */}
          <img src="/qufree-wordmark.png" alt="Qufree" className="navbar-logo-img" />
          {isAdminRoute && <span className="brand-tag">Admin</span>}
        </Link>

        {/* Desktop links */}
        <div className="navbar-links">
          {isPublicRoute && (
            <>
              {/* <Link to="/index" className={`nav-link ${(pathname === '/index' || pathname === '/') ? 'active' : ''}`}> */}
              <Link to="/index" className={`nav-link ${(pathname === '/index' || pathname === '/' || pathname === '/find-business') ? 'active' : ''}`}>
                <Home size={15} /> Home
              </Link>
              <Link to="/index/my-appointments" className={`nav-link ${pathname.includes('my-appointments') ? 'active' : ''}`}>
                <CalendarCheck size={15} /> My Bookings
              </Link>
            </>
          )}
          {isEatsRoute && (
            <>
              <Link to="/index" className="nav-link">
                <Home size={15} /> Home
              </Link>
              <Link to="/qunjeeats" className={`nav-link ${pathname === '/qunjeeats' ? 'active' : ''}`}>
                <UtensilsCrossed size={15} /> Restaurants
              </Link>
              <Link to="/qunjeeats/my-orders" className={`nav-link ${pathname.includes('my-orders') ? 'active' : ''}`}>
                <ClipboardList size={15} /> My Orders
              </Link>
            </>
          )}
          {isSehatRoute && (
            <>
              <Link to="/index" className="nav-link">
                <Home size={15} /> Home
              </Link>
              <Link to="/index/healthcare" className="nav-link">
                <HeartPulse size={15} /> Categories
              </Link>
              <Link to="/index/my-appointments" className={`nav-link ${pathname.includes('my-appointments') ? 'active' : ''}`}>
                <CalendarCheck size={15} /> My Bookings
              </Link>
            </>
          )}
          {isNayasaaRoute && (
            <>
              <Link to="/index" className="nav-link">
                <Home size={15} /> Home
              </Link>
              <Link to="/index/wedding" className="nav-link">
                <Gem size={15} /> Categories
              </Link>
              <Link to="/index/my-appointments" className={`nav-link ${pathname.includes('my-appointments') ? 'active' : ''}`}>
                <CalendarCheck size={15} /> My Bookings
              </Link>
            </>
          )}
          {isRasoomatRoute && (
            <>
              <Link to="/index" className="nav-link">
                <Home size={15} /> Home
              </Link>
              <Link to="/index/wedding" className="nav-link">
                <Camera size={15} /> Categories
              </Link>
              <Link to="/index/my-appointments" className={`nav-link ${pathname.includes('my-appointments') ? 'active' : ''}`}>
                <CalendarCheck size={15} /> My Bookings
              </Link>
            </>
          )}
          {isAdminRoute && user && (
            <>
              <Link to="/admin/dashboard"    className={`nav-link ${pathname === '/admin/dashboard' ? 'active' : ''}`}>
                <LayoutDashboard size={15} /> Dashboard
              </Link>
              {isHotelAdmin ? (
                <Link to="/admin/rooms"      className={`nav-link ${pathname === '/admin/rooms' ? 'active' : ''}`}>
                  <BookOpen size={15} /> {roomsNavLabel}
                </Link>
              ) : (
                <>
                  <Link to="/admin/appointments" className={`nav-link ${pathname === '/admin/appointments' ? 'active' : ''}`}>
                    <BookOpen size={15} /> Appointments
                  </Link>
                  <Link to="/admin/services"     className={`nav-link ${pathname === '/admin/services' ? 'active' : ''}`}>
                    Services
                  </Link>
                </>
              )}
              <Link to="/admin/invoices"     className={`nav-link ${pathname === '/admin/invoices' ? 'active' : ''}`}>
                <Receipt size={15} /> Invoices
              </Link>
              {ownsEats && (
                <>
                  <Link to="/admin/menu"   className={`nav-link ${pathname === '/admin/menu' ? 'active' : ''}`}>
                    <UtensilsCrossed size={15} /> Menu
                  </Link>
                  <Link to="/admin/orders" className={`nav-link ${pathname === '/admin/orders' ? 'active' : ''}`}>
                    <ClipboardList size={15} /> Orders
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* 2026-11-17 (v2): share button moved OUT of the navbar row — it now
            hangs just below the navbar's right edge (see .navbar-share CSS),
            per user screenshot. */}
        {(isPublicRoute || isEatsRoute || isSehatRoute || isNayasaaRoute || isRasoomatRoute) && (
          <ShareMenu
            className="navbar-share"
            url={APP_SHARE_URL}
            title="Qufree — Find any business by its number"
            text="Find any business by its number and book instantly on Qufree."
          />
        )}

        {/* Auth area */}
        <div className="navbar-auth">
          {/* 2026-11-17: general share button (PC + mobile, multiple targets) */}
          {/* {(isPublicRoute || isEatsRoute || isSehatRoute || isNayasaaRoute || isRasoomatRoute) && (
            <ShareMenu
              className="navbar-share"
              url={APP_SHARE_URL}
              title="Qufree — Find any business by its number"
              text="Find any business by its number and book instantly on Qufree."
            />
          )} */}
          {(isPublicRoute || isEatsRoute || isSehatRoute || isNayasaaRoute || isRasoomatRoute) && !isCustomer && (
            <Link to="/index/login" className="btn btn-ghost btn-sm">
              {/* <User size={15} /> Sign In */}
              <User size={15} /> <span className="nav-signin-label">Sign In</span>
            </Link>
          )}
          {(isPublicRoute || isEatsRoute || isSehatRoute || isNayasaaRoute || isRasoomatRoute) && user && isCustomer && (
            <div className="user-menu" ref={dropdownRef} onClick={() => setDropdownOpen(o => !o)}>
              <div className="avatar-wrap">
                <div className="avatar">
                  {userProfile?.photoURL
                    ? <img src={userProfile.photoURL} alt="avatar" />
                    : <span>{(user.displayName || user.email || 'U')[0].toUpperCase()}</span>
                  }
                </div>
                {unreadCount > 0 && <span className="navbar-badge-dot" />}
              </div>
              <span className="user-name">{user.displayName || user.email?.split('@')[0]}</span>
              <ChevronDown size={14} />
              {dropdownOpen && (
                <div className="dropdown">
                  <Link to="/index/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <UserCircle size={15} /> My Profile
                  </Link>
                  <Link to="/index/notifications" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <span className="icon-wrap">
                      <Bell size={15} />
                      {unreadCount > 0 && <span className="navbar-badge-dot" />}
                    </span>
                    My Notifications
                  </Link>
                  <hr />
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {isAdminRoute && user && (
            <div
              className="user-menu"
              ref={dropdownRef}
              onClick={() => setDropdownOpen(o => !o)}
            >
              <div className="avatar">
                {userProfile?.photoURL
                  ? <img src={userProfile.photoURL} alt="avatar" />
                  : <span>{(user.displayName || user.email || 'A')[0].toUpperCase()}</span>
                }
              </div>
              <span className="user-name">{user.displayName || user.email?.split('@')[0]}</span>
              <ChevronDown size={14} />

              {dropdownOpen && (
                <div className="dropdown">
                  <Link to="/admin/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <Settings size={15} /> Business Profile
                  </Link>
                  <hr />
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {isEatsRoute && (
            <>
              <Link to="/index" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <Home size={16} /> Home
              </Link>
              <Link to="/qunjeeats" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <UtensilsCrossed size={16} /> Restaurants
              </Link>
              <Link to="/qunjeeats/my-orders" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <ClipboardList size={16} /> My Orders
              </Link>
            </>
          )}
          {isSehatRoute && (
            <>
              <Link to="/index" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <Home size={16} /> Home
              </Link>
              <Link to="/index/healthcare" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <HeartPulse size={16} /> Categories
              </Link>
              <Link to="/index/my-appointments" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <CalendarCheck size={16} /> My Bookings
              </Link>
            </>
          )}
          {isNayasaaRoute && (
            <>
              <Link to="/index" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <Home size={16} /> Home
              </Link>
              <Link to="/index/wedding" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <Gem size={16} /> Categories
              </Link>
              <Link to="/index/my-appointments" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <CalendarCheck size={16} /> My Bookings
              </Link>
            </>
          )}
          {isRasoomatRoute && (
            <>
              <Link to="/index" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <Home size={16} /> Home
              </Link>
              <Link to="/index/wedding" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <Camera size={16} /> Categories
              </Link>
              <Link to="/index/my-appointments" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <CalendarCheck size={16} /> My Bookings
              </Link>
            </>
          )}
          {isPublicRoute && (
            <>
              <Link to="/index" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <Home size={16} /> Home
              </Link>
              <Link to="/index/my-appointments" className="mobile-link" onClick={() => setMenuOpen(false)}>
                <CalendarCheck size={16} /> My Bookings
              </Link>
              {user && isCustomer ? (
                <>
                  <Link to="/index/profile" className="mobile-link" onClick={() => setMenuOpen(false)}>
                    <UserCircle size={16} /> My Profile
                  </Link>
                  <Link to="/index/notifications" className="mobile-link" onClick={() => setMenuOpen(false)}>
                    <span className="icon-wrap">
                      <Bell size={16} />
                      {unreadCount > 0 && <span className="navbar-badge-dot" />}
                    </span>
                    My Notifications
                  </Link>
                  <button className="mobile-link text-danger" onClick={handleLogout}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </>
              ) : (
                <Link to="/index/login" className="mobile-link" onClick={() => setMenuOpen(false)}>
                  <User size={16} /> Sign In
                </Link>
              )}
            </>
          )}
          {isAdminRoute && user && (
            <>
              <Link to="/admin/dashboard"    className="mobile-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
              {isHotelAdmin ? (
                <Link to="/admin/rooms"      className="mobile-link" onClick={() => setMenuOpen(false)}>{roomsNavLabel}</Link>
              ) : (
                <>
                  <Link to="/admin/appointments" className="mobile-link" onClick={() => setMenuOpen(false)}>Appointments</Link>
                  <Link to="/admin/services"     className="mobile-link" onClick={() => setMenuOpen(false)}>Services</Link>
                </>
              )}
              <Link to="/admin/invoices"     className="mobile-link" onClick={() => setMenuOpen(false)}>Invoices</Link>
              {ownsEats && (
                <>
                  <Link to="/admin/menu"   className="mobile-link" onClick={() => setMenuOpen(false)}>Menu</Link>
                  <Link to="/admin/orders" className="mobile-link" onClick={() => setMenuOpen(false)}>Orders</Link>
                </>
              )}
              <Link to="/admin/profile"      className="mobile-link" onClick={() => setMenuOpen(false)}>Business Profile</Link>
              <button className="mobile-link text-danger" onClick={handleLogout}>
                <LogOut size={16} /> Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
