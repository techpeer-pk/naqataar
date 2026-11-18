import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAdBanner } from '../../hooks/useAdBanners';
import Sk from '../shared/Skeleton';
import AdChip from './AdChip';

// Renders whatever SuperAdmin currently has live for this placement — see
// docs/AdBanners-Plan.md. No banner configured yet → falls back to the
// original "Place your Ad here" mockup rather than rendering nothing, so an
// empty slot is still visible to whoever's deciding what goes there next.
export default function AdBannerStrip({ placement }) {
  const { banner, loading } = useAdBanner(placement);
  // Firestore resolving is one thing, the actual image bytes downloading
  // from Storage is another — without this, the skeleton disappeared the
  // moment the doc loaded and left a blank box until the image painted.
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);

  // useEffect(() => { setImgLoaded(false); }, [banner?.imageUrl]);
  // 2026-11-17 fix: coming back to the page (e.g. via BottomNav) the image is
  // already in the browser's memory cache, so its onLoad fired BEFORE this
  // effect ran — the old effect then reset imgLoaded to false and nothing
  // ever set it back, leaving the ad hidden (opacity 0) behind the skeleton.
  // Now: if the <img> has already finished loading, keep it shown.
  useEffect(() => {
    const img = imgRef.current;
    setImgLoaded(!!(img && img.complete && img.naturalWidth > 0));
  }, [banner?.imageUrl]);

  if (loading) {
    return (
      <div className="ad-banner-placeholder ad-banner-placeholder--live">
        <Sk w="100%" h="100%" r="0" />
      </div>
    );
  }

  if (!banner?.imageUrl) {
    return (
      <div className="ad-banner-placeholder">
        <span>Place your Ad here</span>
      </div>
    );
  }

  const image = (
    <div className="ad-banner-image-wrap">
      {!imgLoaded && <Sk w="100%" h="100%" r="0" style={{ position: 'absolute', inset: 0 }} />}
      <img
        ref={imgRef}
        src={banner.imageUrl}
        alt=""
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgLoaded(true)}
        style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.2s ease' }}
      />
      {imgLoaded && <AdChip />}
    </div>
  );

  if (!banner.linkUrl) {
    return <div className="ad-banner-placeholder ad-banner-placeholder--live">{image}</div>;
  }

  return banner.linkUrl.startsWith('/')
    ? <Link to={banner.linkUrl} className="ad-banner-placeholder ad-banner-placeholder--live">{image}</Link>
    : <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="ad-banner-placeholder ad-banner-placeholder--live">{image}</a>;
}
