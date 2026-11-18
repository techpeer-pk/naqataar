// Single source of truth for Rasoomat's categories — reused by the
// category-grid tiles and the admin registration category picker. Only
// Photography and Videography are built as real slot-booking businesses
// (see docs/FoundationPlanRasoomat.md) — Catering/Personal Gifting/Corporate
// Gifting need their own lead-capture treatment and aren't part of this
// module yet. Images pulled directly from qunjee.com/pages/rasoomat's own
// category photos (real per-category shots exist there, unlike Nayasaa).
export const RASOOMAT_CATEGORIES = [
  { slug: 'photography', label: 'Photography', image: '/rasoomat/photography.jpg', description: 'Professional photographer for homes and offices' },
  { slug: 'videography', label: 'Videography', image: '/rasoomat/videography.jpg', description: 'Professional videography services for homes and offices' },
];
