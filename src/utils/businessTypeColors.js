// Vibrant per-type accent shared by the type filter pills and business cards —
// keep both in sync by importing this map rather than repeating hex values.
export const BUSINESS_TYPE_COLORS = {
  hotel:         '#2563EB',
  salon:         '#C2185B',
  clinic:        '#B91C1C',
  padel:         '#15803D',
  entertainment: '#9333EA',
  sehatkamla:    '#0F3D91',
  restaurant:    '#EB570D',
  nayasaa:       '#6B1E3C',
  rasoomat:      '#1F1B24',
  catering:      '#B45309',
  studyabroad:   '#0369A1',
  makeup:        '#DB2777',
  carrental:     '#334155',
  eventmanagement: '#7C3AED',
  carvalet:      '#0D9488',
  beachhuts:     '#EA580C',
};

// Lighter partner shade per type, paired with BUSINESS_TYPE_COLORS to build a
// two-stop gradient for cards whose business has no logo to show instead.
export const BUSINESS_TYPE_GRADIENT_TO = {
  hotel:         '#60A5FA',
  salon:         '#F472B6',
  clinic:        '#F87171',
  padel:         '#4ADE80',
  entertainment: '#C084FC',
  sehatkamla:    '#38BDF8',
  restaurant:    '#F97316',
  nayasaa:       '#D8698F',
  rasoomat:      '#6B6478',
  catering:      '#F59E0B',
  studyabroad:   '#38BDF8',
  makeup:        '#F472B6',
  carrental:     '#94A3B8',
  eventmanagement: '#A78BFA',
  carvalet:      '#5EEAD4',
  beachhuts:     '#FDBA74',
};
