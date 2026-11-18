import { t } from '../../i18n';
// Small "Sponsored" label shown on top of a live ad (2026-11-17).
// Used by AdBannerStrip (single banner) and AdCarousel (rotating slides).
// Change the wording here only — e.g. 'Ad' instead of 'Sponsored'.
export const AD_CHIP_LABEL = 'Sponsored';

export default function AdChip() {
  return <span className="ad-chip" aria-label={t('Sponsored content')}>{AD_CHIP_LABEL}</span>;
}
