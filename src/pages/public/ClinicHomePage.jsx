import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Stethoscope, Sparkles, LayoutGrid, CalendarCheck } from 'lucide-react';
import { useBusinesses } from '../../hooks/useBusinesses';
import BusinessCard from '../../components/public/BusinessCard';
import Sk from '../../components/shared/Skeleton';
import './LandingPage.css';
import './ClinicHomePage.css';

// Naqatar home: every active clinic, split by businesses.clinicType
// ('medical' | 'aesthetic', set at registration — AdminRegister.jsx).
// Built on QuFree's LandingPage list (same card, same skeleton, same
// useBusinesses.fetchAll query), minus the other verticals.
// The active tab lives in the URL (?type=medical) so it can be shared.
const TABS = [
  { key: 'all',       label: 'Sab Clinics', icon: LayoutGrid },
  { key: 'medical',   label: 'Medical',     icon: Stethoscope },
  { key: 'aesthetic', label: 'Aesthetic',   icon: Sparkles },
];

function BusinessCardSkeleton() {
  return (
    <div className="biz-card" style={{ gap: '0' }}>
      <div className="biz-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem' }}>
        <Sk w="52px" h="52px" r="12px" />
        <Sk w="80px" h="24px" r="999px" />
      </div>
      <div className="biz-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1.25rem 1.25rem' }}>
        <Sk h="1.15rem" w="65%" />
        <Sk h="0.85rem" />
        <Sk h="0.85rem" w="80%" />
        <Sk h="0.8rem" w="50%" r="4px" style={{ marginTop: '0.25rem' }} />
      </div>
      <Sk h="44px" r="0 0 14px 14px" />
    </div>
  );
}

export default function ClinicHomePage() {
  const { businesses, loading, fetchAll } = useBusinesses();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some(t => t.key === searchParams.get('type')) ? searchParams.get('type') : 'all';
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll('clinic'); }, [fetchAll]);

  const counts = useMemo(() => ({
    all:       businesses.length,
    medical:   businesses.filter(b => b.clinicType === 'medical').length,
    aesthetic: businesses.filter(b => b.clinicType === 'aesthetic').length,
  }), [businesses]);

  const q = search.trim().toLowerCase();
  const filtered = businesses.filter(b =>
    (tab === 'all' || b.clinicType === tab)
    && (!q || b.name?.toLowerCase().includes(q) || b.address?.toLowerCase().includes(q))
  );

  const selectTab = (key) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'all') next.delete('type'); else next.set('type', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="landing">
      <section className="browse-head">
        <div className="container">
          <h1 className="browse-title">Clinic appointment, ab aasaan</h1>
          <p className="clinic-home-sub">Medical aur aesthetic clinics. Online booking, line mein lagne ki zaroorat nahi.</p>
          <div className="hero-search">
            <Search size={18} className="search-icon" />
            <input
              className="search-input"
              placeholder="Clinic ka naam ya area likhein…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Clinic search"
            />
          </div>
        </div>
      </section>

      <div className="container clinic-tabs" role="tablist" aria-label="Clinic type">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`clinic-tab ${tab === key ? 'active' : ''}`}
            onClick={() => selectTab(key)}
          >
            <Icon size={16} /> {label}
            {!loading && <span className="clinic-tab-count">{counts[key]}</span>}
          </button>
        ))}
      </div>

      <section id="businesses" className="businesses-section">
        <div className="container">
          {loading ? (
            <div className="grid-3">
              {Array.from({ length: 6 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <CalendarCheck size={40} />
              <p>Koi clinic nahi mila.</p>
              {search && (
                <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>
                  Search saaf karein
                </button>
              )}
            </div>
          ) : (
            <div className="grid-3 fade-up">
              {filtered.map(b => <BusinessCard key={b.id} business={b} ctaLabel="Appointment book karein" />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
