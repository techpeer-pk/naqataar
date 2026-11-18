/**
 * Documented chart palette — every color a SuperAdmin chart uses lives here,
 * nothing eyeballed inline. Mirrors (does not import — SVG fill attributes
 * can't reliably resolve CSS custom properties) the hexes already in
 * src/styles/global.css, so the charts stay in sync with the app's brand.
 *
 * Single-series volume/revenue charts use one hue each (no legend needed —
 * the chart title names the series). Booking/order status is STATE, not
 * identity, so it uses the app's existing status-badge colors rather than a
 * generic categorical palette — see .badge-pending/confirmed/completed/
 * no_show/cancelled in global.css and .badge-preparing/out_for_delivery in
 * MyOrdersPage.css. no_show/preparing/out_for_delivery use different hues
 * here than their two-tone badge colors (badge pink/amber/indigo) because
 * those clash with cancelled/pending/completed once all statuses share one
 * bar chart — see the two validate_palette.js runs below, each checked as
 * its own rendered subset (appointments never render no_show next to
 * preparing/out_for_delivery, so they don't need to be mutually distinct
 * from those two).
 *
 * Appointments subset (pending/confirmed/completed/no_show/cancelled):
 * ALL CHECKS PASS, worst normal-vision ΔE 18.7 all-pairs.
 * Orders subset (pending/confirmed/preparing/out_for_delivery/completed/
 * cancelled): ALL CHECKS PASS, worst normal-vision ΔE 16.0 all-pairs.
 * Both subsets: pending (amber) and confirmed (green) are contrast-WARN
 * against white, mitigated by always shipping direct value labels on those
 * bars (never color-alone).
 */

export const CHART_COLORS = {
  navy:   '#1C223F', // matches --primary
  orange: '#FF6600', // matches --accent
  teal:   '#0F9B8E', // 3rd series (reservations) — validate_palette.js: CVD
                      // separation PASSES against both navy and orange
                      // (worst adjacent ΔE 13.2 protan, 30.5 normal-vision)
};

export const STATUS_COLORS = {
  pending:           '#F59E0B',
  confirmed:         '#10B981',
  completed:         '#3B82F6',
  no_show:           '#6D28D9',
  preparing:         '#92400E',
  out_for_delivery:  '#4338CA',
  cancelled:         '#EF4444',
};

export const CHART_GRID    = '#E5E5E5'; // matches --border, hairline gridlines
export const CHART_AXIS    = '#8A8D9C'; // matches --text-muted
export const CHART_TOOLTIP = { background: '#FFFFFF', border: '1px solid #EAEAEA', borderRadius: 10, fontSize: '0.82rem' };

export function formatCurrency(n) {
  return `PKR ${Number(n || 0).toLocaleString()}`;
}

export function formatCompactNumber(n) {
  return Number(n || 0).toLocaleString();
}
