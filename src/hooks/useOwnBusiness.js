import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBusinesses } from './useBusinesses';

/**
 * Resolves the signed-in businessAdmin's own business doc — profile.businessId
 * preferred, adminUid lookup as fallback (same convention as the admin
 * Dashboard). Resolves to null for everyone who isn't a businessAdmin, so
 * it's safe to call from shared components like the Navbar.
 */
export function useOwnBusiness() {
  const { user, userProfile } = useAuth();
  const { fetchOne, fetchByAdmin } = useBusinesses();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let active = true;
    if (!user || userProfile?.role !== 'businessAdmin') {
      setBusiness(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (userProfile.businessId ? fetchOne(userProfile.businessId) : fetchByAdmin(user.uid))
      .then(b => { if (active) setBusiness(b); })
      .catch(() => { if (active) setBusiness(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, userProfile]);

  return { business, loading };
}
