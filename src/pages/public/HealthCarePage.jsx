import { Link } from 'react-router-dom';
import { Circle } from 'lucide-react';
import { HEALTHCARE_CATEGORIES } from '../../utils/healthcareCategories';
import './HealthCarePage.css';

// Each tile is a category, not a fixed vendor — multiple independent
// businesses can register under the same category (e.g. several labs under
// "Blood Test at Home"), so a tile leads to that category's vendor list
// (/healthcare/:category), never straight into a booking flow.
export default function HealthCarePage() {
  return (
    <div className="healthcare">
      <section className="healthcare-head">
        <div className="container">
          <h1 className="healthcare-head-title">HealthCare</h1>
          <p className="healthcare-head-sub">Healthcare facilitation at your doorstep — doctors, nursing, diagnostics and more.</p>
        </div>
      </section>

      <section className="healthcare-grid-section">
        <div className="container">
          <div className="category-grid">
            {HEALTHCARE_CATEGORIES.map(c => (
              <Link key={c.slug} to={`/healthcare/${c.slug}`} className="category-grid-item">
                <div className="category-grid-image">
                  {c.image
                    ? <img src={c.image} alt={c.label} loading="lazy" />
                    : <div className="category-grid-image-placeholder"><Circle size={28} strokeWidth={1.5} /></div>
                  }
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
