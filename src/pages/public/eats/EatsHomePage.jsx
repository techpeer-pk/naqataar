import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import { useBusinesses } from '../../../hooks/useBusinesses';
import { useCart } from '../../../context/CartContext';
import BusinessCard from '../../../components/public/BusinessCard';
import Sk from '../../../components/shared/Skeleton';
import './EatsHomePage.css';

// Same shape as /index/browse: the FoodVend list IS the page — one compact
// head (title + search), then cards, all above the fold. No marketing hero,
// no features strip.
export default function EatsHomePage() {
  const { businesses, loading, fetchAll } = useBusinesses();
  const { itemCount } = useCart();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll('restaurant'); }, []);

  // Only opted-in FoodVends appear on Eats — offersOrdering is set by Ops.
  const foodvends = businesses.filter(b => b.offersOrdering === true);
  const filtered = foodvends.filter(b =>
    !search
    || b.name.toLowerCase().includes(search.toLowerCase())
    || b.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="eats-home">
      <section className="eats-head">
        <div className="container">
          <h1 className="eats-head-title">Order food from your favorite restaurants</h1>
          <div className="eats-search">
            <Search size={18} className="eats-search-icon" />
            <input
              className="eats-search-input"
              placeholder="Search restaurants, areas…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="eats-list-section">
        <div className="container">
          {loading ? (
            <div className="grid-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card"><div className="card-body">
                  <Sk w="55%" h="1.2rem" mb="0.5rem" />
                  <Sk h="0.85rem" mb="0.35rem" />
                  <Sk w="70%" h="0.85rem" />
                </div></div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <UtensilsCrossed size={40} />
              <p>No restaurants available yet.</p>
              {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>Clear search</button>}
            </div>
          ) : (
            <div className="grid-3 fade-up">
              {filtered.map(b => (
                // <BusinessCard key={b.id} business={b} to={`/qunjeeats/business/${b.id}`} ctaLabel="View Menu" />
                <BusinessCard key={b.id} business={b} to={`/qunjeeats/business/${b.id}`} ctaLabel="Book A Table" />
              ))}
            </div>
          )}
        </div>
      </section>

      {itemCount > 0 && (
        <Link to="/qunjeeats/cart" className="eats-cart-fab" aria-label="View cart">
          <ShoppingCart size={18} />
          <span>{itemCount}</span>
        </Link>
      )}
    </div>
  );
}
