import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './ServiceCarousel.css';

// Room-pool types book through their own pages (POOL_TYPE_META in
// BusinessPage.jsx). Eats vendors are slot-engine restaurants in practice;
// for anything else, send people to the business page rather than guess.
const POOL_TYPES = ['hotel', 'nayasaa', 'beachhuts'];

/**
 * Swipeable strip of a business's service photos (e.g. Table for 4 / 8 / 12)
 * for the Eats business page — its menu section is hibernated, which left the
 * page empty under the header. Each slide books that exact service
 * (BookingPage preselects it from ?service=). Plain CSS scroll-snap, so swipe
 * is native and no carousel library lands in the bundle. `services` arrive
 * already sorted by useServices (Promo first, then 4 → 8 → 12).
 */
export default function ServiceCarousel({ business, services }) {
  const trackRef = useRef(null);
  const [active, setActive]       = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const slides = services.filter(s => s.image);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const max = track.scrollWidth - track.clientWidth;
      setCanScroll(max > 4);
      const first = track.firstElementChild;
      if (!first) return;
      const step = first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0);
      // The last card can't snap to the left edge (nothing after it), so
      // treat "scrolled to the end" as the last slide.
      const idx = track.scrollLeft >= max - 4 ? slides.length - 1 : Math.round(track.scrollLeft / step);
      setActive(Math.max(0, Math.min(slides.length - 1, idx)));
    };

    measure();
    track.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => {
      track.removeEventListener('scroll', measure);
      ro.disconnect();
    };
  }, [slides.length]);

  if (slides.length === 0) return null;

  const bookTo = (s) => POOL_TYPES.includes(business.type)
    ? `/index/business/${business.id}`
    : `/index/booking/${business.id}?service=${s.id}`;

  const goTo = (i) => {
    const track = trackRef.current;
    const el = track?.children[i];
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({
      left: el.offsetLeft - (parseFloat(getComputedStyle(track).paddingLeft) || 0),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section className="svc-carousel" aria-roledescription="carousel" aria-label="Reserve a Table">
      <h2 className="svc-carousel-title">Reserve a Table</h2>

      <ul className="svc-carousel-track" ref={trackRef}>
        {slides.map((s, i) => (
          <li key={s.id} className="svc-slide" aria-roledescription="slide" aria-label={`${i + 1} of ${slides.length}`}>
            <Link to={bookTo(s)} className="svc-slide-link">
              <div className="svc-slide-photo-wrap">
                <img
                  src={s.image}
                  alt={s.name}
                  className="svc-slide-photo"
                  width="800"
                  height="600"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                {s.onTop && <span className="badge badge-promo svc-slide-promo">Promo</span>}
              </div>
              <div className="svc-slide-body">
                <div className="svc-slide-row">
                  <span className="svc-slide-name">{s.name}</span>
                  <span className="svc-slide-book">Book</span>
                </div>
                {s.description && <p className="svc-slide-desc">{s.description}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {canScroll && slides.length > 1 && (
        <div className="svc-carousel-dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`svc-dot ${i === active ? 'active' : ''}`}
              aria-label={`Show ${s.name}`}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
