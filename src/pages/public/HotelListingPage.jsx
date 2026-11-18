import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BedDouble, ChevronLeft } from 'lucide-react';
import { useBusinesses } from '../../hooks/useBusinesses';
import BusinessCard from '../../components/public/BusinessCard';
import Sk from '../../components/shared/Skeleton';
import './LandingPage.css';

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

// Dedicated hotel listing, separate from the general appointment Browse page
// — a standalone entry point for guests who came here specifically to book a
// room, not to filter through salons/clinics/padel clubs first.
export default function HotelListingPage() {
  const navigate = useNavigate();
  const { businesses, loading, fetchAll } = useBusinesses();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll('hotel'); }, []);

  const filtered = businesses.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="landing">
      <section className="browse-head">
        <div className="container">
          <button type="button" onClick={() => navigate(-1)} className="back-link"><ChevronLeft size={16} /> All Categories</button>
          <h1 className="browse-title">Book a Hotel Room</h1>
          <div className="hero-search">
            <Search size={18} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search hotels, areas…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section id="businesses" className="businesses-section">
        <div className="container">
          {loading ? (
            <div className="grid-3">
              {Array.from({ length: 6 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <BedDouble size={40} />
              <p>No hotels found.</p>
              {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>Clear search</button>}
            </div>
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
