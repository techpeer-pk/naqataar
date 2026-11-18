import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, CalendarCheck, Utensils } from 'lucide-react';
import { useBusinesses } from '../../hooks/useBusinesses';
import BusinessCard from '../../components/public/BusinessCard';
import Sk from '../../components/shared/Skeleton';
import './LandingPage.css';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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

// The business list IS the page — no marketing hero, no pill filter anymore
// (2026-08-31: Padel Clubs/Entertainment pills dropped, both had zero real
// businesses; Hotels/Salons/Clinics pills dropped earlier the same day since
// those types already have dedicated entry points via /index's category
// cards). This page is no longer a Navbar destination — it's reached only
// via a specific ?type= deep-link (e.g. /index/salon's tiles), so there's
// nothing left to pick from once you're here.
export default function LandingPage() {
  const { businesses, loading, fetchAll } = useBusinesses();
  const [searchParams] = useSearchParams();
  const [activeType]   = useState(() => searchParams.get('type') || null);
  // Salon tiles split into Men's/Women's on /index/salon (both point at
  // type=salon) — distinguished by this businesses.salonGender flag, set by
  // hand on each salon's Firestore doc (no admin UI for it yet). Only
  // filtered when present in the URL, so every other ?type= deep-link is
  // unaffected.
  const [activeGender] = useState(() => searchParams.get('gender') || null);
  // Same pattern as activeGender above — Aesthetic Clinic (Salon & Personal
  // Care) vs Clinic Appointment (HealthCare) both browse type=clinic, split
  // by this businesses.clinicType flag set at registration (AdminRegister.jsx).
  const [activeClinicType] = useState(() => searchParams.get('clinicType') || null);
  const [search, setSearch] = useState('');
  const [activeLetter, setActiveLetter] = useState(null);

  useEffect(() => { fetchAll(activeType); }, [activeType]);

  // Restaurants live on /qunjeeats or /restaurant-booking now, and
  // HealthCare/Nayasaa/Rasoomat vendors are browsed via their own category
  // pages (/healthcare, /nayasaa, /rasoomat) — all excluded here so clearing
  // the type filter (which fetches every type) never mixes them into the
  // general clinic/salon/etc. browse list.
  const typeFiltered = businesses.filter(b =>
    b.type !== 'restaurant'
    && b.type !== 'sehatkamla'
    && b.type !== 'nayasaa'
    && b.type !== 'rasoomat'
    && (!activeGender || b.salonGender === activeGender)
    && (!activeClinicType || b.clinicType === activeClinicType)
  );

  // Which letters actually have a business, so the A-Z bar can grey out
  // (not just no-op) the ones that would only dead-end into "No businesses found".
  const availableLetters = new Set(
    typeFiltered.map(b => b.name?.trim()?.[0]?.toUpperCase()).filter(l => l && ALPHABET.includes(l))
  );

  const filtered = typeFiltered.filter(b =>
    (!activeLetter || b.name.trim().toUpperCase().startsWith(activeLetter))
    && (!search || b.name.toLowerCase().includes(search.toLowerCase()) || b.address?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="landing">
      <section className="browse-head">
        <div className="container">
          <h1 className="browse-title">Book Instantly</h1>
          <div className="hero-search">
            <Search size={18} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search businesses, areas…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <div className="az-filter container">
        <button
          type="button"
          className={`az-btn ${!activeLetter ? 'active' : ''}`}
          onClick={() => setActiveLetter(null)}
        >
          All
        </button>
        {ALPHABET.map(letter => (
          <button
            key={letter}
            type="button"
            className={`az-btn ${activeLetter === letter ? 'active' : ''}`}
            disabled={!availableLetters.has(letter)}
            onClick={() => setActiveLetter(prev => prev === letter ? null : letter)}
          >
            {letter}
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
            // Restaurants are FoodVends today (ordering, not table booking) —
            // an empty "Restaurant" tab should hand the user to QunjeeEats
            // instead of dead-ending them.
            activeType === 'restaurant' && !search ? (
              <div className="empty-state">
                <Utensils size={40} />
                <p>Restaurants take food orders on QunjeeEats.</p>
                <Link to="/qunjeeats" className="btn btn-primary">
                  <Utensils size={16} /> Order Food
                </Link>
              </div>
            ) : (
              <div className="empty-state">
                <CalendarCheck size={40} />
                <p>No businesses found.</p>
                {(search || activeLetter) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setActiveLetter(null); }}>
                    Clear filters
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="grid-3 fade-up">
              {filtered.map(b => <BusinessCard key={b.id} business={b} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
