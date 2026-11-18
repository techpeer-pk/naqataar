// Single source of truth for Nayasaa's 4 categories — reused by the
// category-grid tiles and the admin registration category picker.
// No per-category photos exist on qunjee.com/pages/nayasaa (checked —
// only one generic banner image, no distinct product shots), so tiles are
// icon-based (see ICONS map in NayasaaPage.jsx) rather than photo-based
// like SehatKamla's grid.
export const NAYASAA_CATEGORIES = [
  { slug: 'bridal',       label: 'Bridal Collection',      description: 'Designer bridal lehengas, gowns and traditional wedding outfits' },
  { slug: 'groom',        label: 'Groom Collection',       description: 'Luxury sherwanis, prince coats and formal groom wear' },
  { slug: 'formal',       label: 'Formal Dresses',         description: 'Perfect for Walima, receptions and evening events' },
  { slug: 'semi-formal',  label: 'Semi-Formal Dresses',    description: 'Ideal for Mehndi, Dholki and family celebrations' },
];
