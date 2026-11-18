import { UtensilsCrossed } from 'lucide-react';
import { useOwnBusiness } from '../../hooks/useOwnBusiness';
import FoodVendMenuPage from '../eatsadmin/FoodVendMenuPage';
import Sk from '../../components/shared/Skeleton';
import './Dashboard.css';

// F2 owner console: the vendor manages their own menu. Thin shell around the
// Ops menu page — same UI, scoped to the owner's business via prop.
export default function AdminMenuPage() {
  const { business, loading } = useOwnBusiness();

  if (loading) {
    return (
      <div className="admin-layout page">
        <div className="container">
          <Sk w="220px" h="2rem" mb="1rem" />
          {Array.from({ length: 4 }).map((_, i) => <Sk key={i} h="52px" r="10px" mb="0.75rem" />)}
        </div>
      </div>
    );
  }

  if (!business || business.offersOrdering !== true) {
    return (
      <div className="admin-layout page">
        <div className="container">
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <UtensilsCrossed size={40} />
            <p>Food ordering is not enabled for your business.</p>
            <p style={{ fontSize: '0.85rem' }}>Contact the Qunjee team to join QunjeeEats.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout page">
      <div className="container">
        <FoodVendMenuPage businessId={business.id} />
      </div>
    </div>
  );
}
