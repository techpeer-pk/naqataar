import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, CalendarCheck, Hotel, ScrollText, BarChart3, UserCog, LogOut, Menu, X, UtensilsCrossed, Receipt, HelpCircle, Megaphone, ChevronDown, History, Image, Headphones, Gamepad2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './SuperAdminLayout.css';

const NAV_GROUPS = [
  { items: [
    { to: '/superadmin',             label: 'Overview',      icon: LayoutDashboard, end: true },
  ] },
  { label: 'Operations', items: [
    { to: '/superadmin/users',       label: 'Users',         icon: Users },
    { to: '/superadmin/businesses',  label: 'Businesses',    icon: Building2 },
    { to: '/superadmin/appointments',label: 'Appointments',  icon: CalendarCheck },
    { to: '/superadmin/reservations',label: 'Reservations',  icon: Hotel },
    { to: '/superadmin/orders',      label: 'Food Orders',   icon: UtensilsCrossed },
    { to: '/superadmin/invoices',    label: 'Invoices',      icon: Receipt },
  ] },
  { label: 'Insights', items: [
    { to: '/superadmin/reports',     label: 'Reports',       icon: BarChart3 },
    { to: '/superadmin/activity',    label: 'Activity Log',  icon: ScrollText },
    { to: '/superadmin/sessions',    label: 'Session Logs',  icon: History },
    { to: '/superadmin/csr-activity',label: 'CSR Activity',  icon: Headphones },
  ] },
  { label: 'Engagement', items: [
    { to: '/superadmin/faqs',        label: 'FAQs',          icon: HelpCircle },
    { to: '/superadmin/push',        label: 'Push Campaigns',icon: Megaphone },
    { to: '/superadmin/ads',         label: 'Ad Management', icon: Image },
    { to: '/superadmin/gamify',      label: 'Gamify',        icon: Gamepad2 },
  ] },
];

const GROUP_LABELS = NAV_GROUPS.filter(g => g.label).map(g => g.label);

export default function SuperAdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set(GROUP_LABELS));

  // Accordion: opening a group collapses every other one; opening the
  // already-open group collapses it too (so all-collapsed is reachable).
  const toggleGroup = (label) => setCollapsedGroups(prev =>
    prev.has(label) ? new Set(GROUP_LABELS.filter(l => l !== label)) : new Set(GROUP_LABELS)
  );

  const handleLogout = async () => {
    await logout();
    navigate('/superadmin/login');
  };

  return (
    <div className="sa-shell">
      <aside className={`sa-sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="sa-sidebar-brand">
          {/* <img src="/qunjee-logo.png" alt="Qunjee" className="sa-sidebar-logo" /> */}
          {/* <img src="/qufree-logo.png" alt="Qufree" className="sa-sidebar-logo" /> */}
          <img src="/qufree-wordmark.png" alt="Qufree" className="sa-sidebar-logo" />
          <span className="sa-sidebar-tag">Super Admin</span>
        </div>
        <nav className="sa-nav">
          {NAV_GROUPS.map(({ label, items }, i) => {
            const collapsed = label && collapsedGroups.has(label);
            return (
              <div className="sa-nav-group" key={label || i}>
                {label && (
                  <button type="button" className="sa-nav-heading" onClick={() => toggleGroup(label)}>
                    {label}
                    <ChevronDown size={13} className={`sa-nav-chevron ${collapsed ? 'collapsed' : ''}`} />
                  </button>
                )}
                {!collapsed && items.map(({ to, label: itemLabel, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `sa-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <Icon size={17} /> {itemLabel}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <NavLink
          to="/superadmin/profile"
          className={({ isActive }) => `sa-nav-link ${isActive ? 'active' : ''}`}
          onClick={() => setDrawerOpen(false)}
          style={{ margin: '0 0.75rem' }}
        >
          <UserCog size={17} /> Profile
        </NavLink>
        <button className="sa-logout" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </aside>

      {drawerOpen && <div className="sa-backdrop" onClick={() => setDrawerOpen(false)} />}

      <div className="sa-main">
        <header className="sa-topbar">
          <button className="sa-menu-toggle" onClick={() => setDrawerOpen(o => !o)} aria-label="Toggle menu">
            {drawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="sa-topbar-title">SuperAdmin Console</span>
        </header>
        <main className="sa-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
