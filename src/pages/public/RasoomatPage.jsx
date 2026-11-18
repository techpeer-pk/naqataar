import { Link } from 'react-router-dom';
import { RASOOMAT_CATEGORIES } from '../../utils/rasoomatCategories';
import './RasoomatPage.css';

// Each tile is a category, not a fixed vendor — multiple independent
// photographers/videographers can register under the same category, so a
// tile leads to that category's vendor list (/rasoomat/:category), never
// straight into a booking flow. Same shape as SehatKamlaPage.
export default function RasoomatPage() {
  return (
    <div className="rasoomat">
      <section className="rasoomat-head">
        <div className="container">
          <h1 className="rasoomat-head-title">Photography &amp; Videography</h1>
          <p className="rasoomat-head-sub">Elegant events, cinematic photography &amp; professional videography — book trusted local pros.</p>
        </div>
      </section>

      <section className="rasoomat-grid-section">
        <div className="container">
          <div className="category-grid">
            {RASOOMAT_CATEGORIES.map(c => (
              <Link key={c.slug} to={`/rasoomat/${c.slug}`} className="category-grid-item">
                <div className="category-grid-image">
                  <img src={c.image} alt={c.label} loading="lazy" />
                </div>
                <p className="category-grid-label">{c.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
