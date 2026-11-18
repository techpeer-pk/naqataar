import { Link } from 'react-router-dom';
import { Gem, Shirt, Sparkles, PartyPopper } from 'lucide-react';
import { NAYASAA_CATEGORIES } from '../../utils/nayasaaCategories';
import './NayasaaPage.css';

// No per-category photos exist on qunjee.com/pages/nayasaa (checked directly —
// only one generic banner image), so tiles are icon-based rather than
// photo-based like SehatKamla's grid. Swap for real photos once sourced.
const ICONS = {
  bridal:      <Gem size={28} />,
  groom:       <Shirt size={28} />,
  formal:      <Sparkles size={28} />,
  'semi-formal': <PartyPopper size={28} />,
};

// Each tile is a category, not a fixed vendor — multiple independent
// rental shops can register under the same category, so a tile leads to
// that category's vendor list (/nayasaa/:category), never straight into a
// booking flow. Same reasoning as SehatKamlaPage.
export default function NayasaaPage() {
  return (
    <div className="nayasaa">
      <section className="nayasaa-head">
        <div className="container">
          <h1 className="nayasaa-head-title">Wedding Dress Rental</h1>
          <p className="nayasaa-head-sub">Bridal &amp; groom attire rental — designer outfits at a fraction of the retail price.</p>
        </div>
      </section>

      <section className="nayasaa-grid-section">
        <div className="container">
          <div className="category-grid">
            {NAYASAA_CATEGORIES.map(c => (
              <Link key={c.slug} to={`/nayasaa/${c.slug}`} className="category-grid-item">
                <div className="category-grid-icon">{ICONS[c.slug]}</div>
                <p className="category-grid-label">{c.label}</p>
                <p className="category-grid-desc">{c.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
