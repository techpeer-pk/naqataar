import { useState, useEffect } from 'react';

// Tracks the same breakpoint BottomNav/Navbar switch on via CSS (990px), so
// JS-side decisions (like docking the support-chat trigger into the bottom
// bar) stay in sync with what's actually visible on screen.
export function useIsMobile(breakpoint = 990) {
  const query = `(max-width: ${breakpoint}px)`;
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return isMobile;
}
