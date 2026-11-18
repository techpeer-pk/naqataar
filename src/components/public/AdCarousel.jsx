import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAdBanner } from '../../hooks/useAdBanners';
import Sk from '../shared/Skeleton';
import AdChip from './AdChip';
import { t } from '../../i18n';

const AUTOPLAY_MS = 4000;
const SWIPE_PX = 40;

// Rotating ad slot — reads adBanners/{placement}.slides, set from SuperAdmin
// → Ad Management → "Ad Carousel". Same fallback rule as AdBannerStrip: no
// slides yet → "Place your Ad here" mockup instead of an empty gap.
export default function AdCarousel({ placement }) {
  const { banner, loading } = useAdBanner(placement);
  const slides = (banner?.slides || []).filter(s => s?.imageUrl);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);

  // Slides removed in admin while someone is viewing — don't point past the end.
  useEffect(() => { if (index >= slides.length) setIndex(0); }, [slides.length, index]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  if (loading) {
    return <div className="ad-carousel"><Sk w="100%" h="100%" r="0" /></div>;
  }

  if (!slides.length) {
    return <div className="ad-carousel ad-carousel--empty"><span>{t('Place your Ad here')}</span></div>;
  }

  const go = (i) => setIndex((i + slides.length) % slides.length);

  return (
    <div
      className="ad-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
        if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
        setPaused(false);
      }}
    >
      <div className="ad-carousel-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {slides.map((s, i) => {
          const img = <img src={s.imageUrl} alt="" loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />;
          if (!s.linkUrl) return <div className="ad-carousel-slide" key={i}>{img}</div>;
          return s.linkUrl.startsWith('/')
            ? <Link className="ad-carousel-slide" key={i} to={s.linkUrl}>{img}</Link>
            : <a className="ad-carousel-slide" key={i} href={s.linkUrl} target="_blank" rel="noopener noreferrer">{img}</a>;
        })}
      </div>

      <AdChip />

      {slides.length > 1 && (
        <div className="ad-carousel-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ad ${i + 1}`}
              className={`ad-carousel-dot ${i === index ? 'active' : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
