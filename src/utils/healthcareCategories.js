// Single source of truth for HealthCare's 6 categories — reused by the
// category-grid tiles, the admin registration category picker, and the
// per-category vendor-list page heading. Firestore business `type` for this
// vertical stays 'sehatkamla' (unchanged data-model value, see CLAUDE.md) —
// only the user-facing brand name is "HealthCare".
export const HEALTHCARE_CATEGORIES = [
  { slug: 'doctor-home',   label: 'Doctor at Home',         image: '/healthcare/doctor.jpg' },
  { slug: 'xray-home',     label: 'X-ray at Home',          image: '/healthcare/xray.jpg' },
  { slug: 'nursing',       label: 'Nursing Services',       image: '/healthcare/nursing.jpg' },
  { slug: 'physiotherapy', label: 'Physiotherapy',          image: '/healthcare/physio.jpg' },
  { slug: 'blood-test',    label: 'Blood Test at Home',     image: '/healthcare/bloodtest.jpg' },
  { slug: 'ambulance',     label: 'Book Ambulance at Home', image: '/healthcare/ambulance.jpg' },
  // No sourced photo yet — HealthCarePage's grid falls back to a placeholder
  // glyph for any category missing `image` (see icon-inventory memory).
  { slug: 'medicine-consultancy', label: 'Medicine Consultancy', image: null },
];
