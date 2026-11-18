import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import {
  CalendarCheck, Menu, X, User, LogOut,
  LayoutDashboard, BookOpen, Settings, ChevronDown, UserCircle,
  Receipt, Home, Bell,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ShareMenu from './ShareMenu';
import './Navbar.css';

// Naqatar (clinic-only): two shells — customer (public) and clinic admin.
// QuFree's Eats / HealthCare / Nayasaa / Rasoomat / hotel-rooms / menu-orders
// branches were removed with their routes (see App.jsx).

const APP_SHARE_URL = 'https://naqatar.web.app/';

export default function Navbar() {
  const { user, userProfile, isCustomer, logout } = useAuth();
  // Notifications are only ever logged for customers (bookings), see
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
  const isPublicRoute = pathname === '/' || pathname === '/clinics' || pathname.startsWith('/index');
  const isHome        = pathname === '/';

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  if (!isAdminRoute && !isPublicRoute) return null;

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

        <Link to={isAdminRoute ? '/admin/dashboard' : '/'} className="navbar-brand">
          <img src="/brand/naqatar-lockup.png" alt="Naqatar" className="navbar-logo-img" width={522} height={160} />
          {isAdminRoute && <span className="brand-tag">Admin</span>}
        </Link>

        {/* Desktop links */}
        <div className="navbar-links">
          {isPublicRoute && (
            <>
              <Link to="/" className={`nav-link ${isHome ? 'active' : ''}`}>
                <Home size={15} /> Home
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
              <Link to="/admin/appointments" className={`nav-link ${pathname === '/admin/appointments' ? 'active' : ''}`}>
                <BookOpen size={15} /> Appointments
              </Link>
              <Link to="/admin/services"     className={`nav-link ${pathname === '/admin/services' ? 'active' : ''}`}>
                Services
              </Link>
              <Link to="/admin/invoices"     className={`nav-link ${pathname === '/admin/invoices' ? 'active' : ''}`}>
                <Receipt size={15} /> Invoices
              </Link>
            </>
          )}
        </div>

        {/* Share hangs just below the navbar's right edge (.navbar-share CSS). */}
        {isPublicRoute && (
          <ShareMenu
            className="navbar-share"
            url={APP_SHARE_URL}
            title="Naqatar: Clinic appointments made easy"
            text="Find any clinic by its number and book an appointment instantly on Naqatar."
          />
        )}

        {/* Auth area */}
        <div className="navbar-auth">
          {isPublicRoute && !isCustomer && (
            <Link to="/index/login" className="btn btn-ghost btn-sm">
              <User size={15} /> <span className="nav-signin-label">Sign In</span>
            </Link>
          )}
          {isPublicRoute && user && isCustomer && (
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
          {isPublicRoute && (
            <>
              <Link to="/" className="mobile-link" onClick={() => setMenuOpen(false)}>
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
              <Link to="/admin/appointments" className="mobile-link" onClick={() => setMenuOpen(false)}>Appointments</Link>
              <Link to="/admin/services"     className="mobile-link" onClick={() => setMenuOpen(false)}>Services</Link>
              <Link to="/admin/invoices"     className="mobile-link" onClick={() => setMenuOpen(false)}>Invoices</Link>
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
