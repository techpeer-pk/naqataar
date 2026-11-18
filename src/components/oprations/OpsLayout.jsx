import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, CalendarCheck, Hotel, UtensilsCrossed, LogOut, Menu, X, Briefcase } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
// Same shell styling as the SuperAdmin/EatsAdmin/CSR consoles — one visual
// language for every internal console.
import '../superadmin/SuperAdminLayout.css';

const TIER_LABELS = { teamLead: 'Team Lead', managerBD: 'Manager, Business Development', managerOps: 'Manager, Operations' };

const NAV_ITEMS = [
  { to: '/oprations',              label: 'Overview',     icon: LayoutDashboard, end: true },
  { to: '/oprations/businesses',   label: 'Businesses',   icon: Building2 },
  { to: '/oprations/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/oprations/reservations', label: 'Reservations', icon: Hotel },
  { to: '/oprations/orders',       label: 'Orders',       icon: UtensilsCrossed },
];

export default function OpsLayout() {
  const { logout, opsRole, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/oprations/login');
  };

  return (
    <div className="sa-shell">
      <aside className={`sa-sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="sa-sidebar-brand">
          {/* <img src="/qunjee-logo.png" alt="Qunjee" className="sa-sidebar-logo" /> */}
          {/* <img src="/qufree-logo.png" alt="Qufree" className="sa-sidebar-logo" /> */}
          <img src="/qufree-wordmark.png" alt="Qufree" className="sa-sidebar-logo" />
          <span className="sa-sidebar-tag">Operations</span>
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
          <span className="sa-topbar-title">Operations Console</span>
          <span className="sa-topbar-title" style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Briefcase size={14} /> {isSuperAdmin && !opsRole ? 'SuperAdmin' : TIER_LABELS[opsRole] || ''}
          </span>
        </header>
        <main className="sa-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
