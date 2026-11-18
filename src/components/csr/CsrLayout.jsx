import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, ClipboardList, LogOut, Menu, X, UserCog, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
// Same shell styling as the SuperAdmin/EatsAdmin consoles — one visual
// language for every internal console.
import '../superadmin/SuperAdminLayout.css';

const NAV_ITEMS = [
  { to: '/qufreecrm',          label: 'Lookup',    icon: Search, end: true },
  { to: '/qufreecrm/livechat', label: 'Live Chat', icon: MessageCircle },
  { to: '/qufreecrm/tickets',  label: 'Tickets',   icon: ClipboardList },
];

export default function CsrLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/qufreecrm/login');
  };

  return (
    <div className="sa-shell">
      <aside className={`sa-sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="sa-sidebar-brand">
          {/* <img src="/qunjee-logo.png" alt="Qunjee" className="sa-sidebar-logo" /> */}
          {/* <img src="/qufree-logo.png" alt="Qufree" className="sa-sidebar-logo" /> */}
          <img src="/qufree-wordmark.png" alt="Qufree" className="sa-sidebar-logo" />
          <span className="sa-sidebar-tag">Support</span>
        </div>
        <nav className="sa-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sa-nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <NavLink
          to="/qufreecrm/profile"
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
          <span className="sa-topbar-title">CSR Console</span>
        </header>
        <main className="sa-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
