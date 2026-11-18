import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, HeartPulse } from 'lucide-react';
import { useBusinesses } from '../../hooks/useBusinesses';
import { HEALTHCARE_CATEGORIES } from '../../utils/healthcareCategories';
import BusinessCard from '../../components/public/BusinessCard';
import Sk from '../../components/shared/Skeleton';
import './CategoryVendorList.css';

function VendorCardSkeleton() {
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
      </div>
      <Sk h="44px" r="0 0 14px 14px" />
    </div>
  );
}

// Multi-vendor listing for one HealthCare category — same shape as
// /index/browse, just pre-filtered to type='sehatkamla' businesses (the
// Firestore data-model value stays 'sehatkamla', only the brand name shown
// to users is "HealthCare" — see CLAUDE.md) whose own category field
// matches this route param. Vendors are otherwise ordinary businesses
// (BusinessCard → BusinessPage → BookingPage, unchanged).
export default function HealthCareCategoryPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  const { businesses, loading, fetchAll } = useBusinesses();

  useEffect(() => { fetchAll('sehatkamla'); }, []);

  const meta = HEALTHCARE_CATEGORIES.find(c => c.slug === category);
  const vendors = businesses.filter(b => b.category === category);

  return (
    <div className="healthcare-category page">
      <div className="container">
        <button type="button" onClick={() => navigate(-1)} className="back-link"><ChevronLeft size={16} /> All Categories</button>

        <h1 className="section-heading">{meta?.label || 'Providers'}</h1>

        {loading ? (
          <div className="grid-3">
            {Array.from({ length: 3 }).map((_, i) => <VendorCardSkeleton key={i} />)}
          </div>
        ) : vendors.length === 0 ? (
          <div className="empty-state">
            <HeartPulse size={40} />
            <p>No providers registered for this service yet.</p>
          </div>
        ) : (
          <div className="grid-3 fade-up">
            {vendors.map(b => <BusinessCard key={b.id} business={b} />)}
          </div>
        )}
      </div>
    </div>
  );
}
