import { Link, useLocation } from 'react-router-dom';
import { Home, Search, CalendarCheck, MessageCircle, UserCircle } from 'lucide-react';
import { CHAT_TOGGLE_EVENT } from '../../utils/chatEvents';
import { useAuth } from '../../context/AuthContext';
import './BottomNav.css';

export default function BottomNav({ showChatTab = false, visible = false }) {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // "/" is the same HomePage as "/index" (see App.jsx routes) but isn't
  // itself prefixed by "/index", so it needs its own explicit check.
  const isHome         = pathname === '/' || pathname === '/index';
  const isPublicRoute = isHome || pathname.startsWith('/index') || pathname.startsWith('/bookinghotels') || pathname.startsWith('/hotel-booking') || pathname.startsWith('/restaurant-booking') || pathname.startsWith('/healthcare') || pathname.startsWith('/nayasaa') || pathname.startsWith('/rasoomat') || pathname.startsWith('/gamify') || pathname === '/admin/login' || pathname === '/admin/register';
  const isEatsRoute   = pathname.startsWith('/qunjeeats');
  // if (!isPublicRoute && !isEatsRoute) return null;
  // Visibility now decided once in App.jsx (showBottomNav) — this local
  // route list had drifted from it (/pfo, /beachhuts-booking).
  if (!visible) return null;

  // Kept separate from "Search" so it doesn't light up while the user is
  // actually on a profile/login page.
  const isAccountActive   = pathname.startsWith('/index/profile') || pathname.startsWith('/index/login') || pathname.startsWith('/index/register') || pathname === '/admin/login' || pathname === '/admin/register';
  const isMyBookingActive = pathname.startsWith('/index/my-appointments');

  const tabs = [
    { label: 'Home',       to: '/index',                  icon: Home,          active: isHome },
    // "Search" tab disabled 2026-11-17 — /index/browse route is switched off
    // in App.jsx (only /find-business + /index/business/:id are live).
    // { label: 'Search',     to: '/index/browse',           icon: Search,        active: isPublicRoute && !isHome && !isAccountActive && !isMyBookingActive },
    // "Eats" tab hibernated (2026-09-07) — QunjeeEats ops on hold, still
    // reachable via the category pages, just no longer a primary nav tab.
    { label: 'My Booking', to: '/index/my-appointments',  icon: CalendarCheck, active: isMyBookingActive },
    // Replaces the old broadcast-bell tab (that bell only ever showed one
    // global admin message, not a personal list — see BellNotification.jsx
    // — and users mistook it for their own notifications). Personal
    // notifications/account now live one tap away via Profile; the
    // broadcast bell is still reachable from the top Navbar dropdown.
    { label: 'Account',    to: user ? '/index/profile' : '/index/login', icon: UserCircle, active: isAccountActive },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <Link key={t.label} to={t.to} className={`bottom-nav-item ${t.active ? 'active' : ''}`}>
          <t.icon size={20} />
          <span>{t.label}</span>
        </Link>
      ))}
      {showChatTab && (
        <button
          type="button"
          className="bottom-nav-item"
          onClick={() => window.dispatchEvent(new Event(CHAT_TOGGLE_EVENT))}
        >
          <MessageCircle size={20} />
          <span>Help</span>
        </button>
      )}
    </nav>
  );
}
