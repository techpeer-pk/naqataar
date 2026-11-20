import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import './BusyOverlay.css';

// Generic "please wait" overlay (2026-11-20): a 45% white screen with a
// spinner over the whole app while an action talks to the server. It also
// swallows taps, so an impatient second tap can't run the action twice.
// Only used where a screen had no loader of its own — existing button /
// skeleton loaders are left as they are.
//
//   const { withBusy } = useBusy();
//   await withBusy(() => remove(id));        // overlay while the promise runs
//
//   const { setBusy } = useBusy();           // for work started in an effect
//   setBusy('camera', true) … setBusy('camera', false)

const BusyContext = createContext({ withBusy: (fn) => fn(), setBusy: () => {}, isBusy: false });

export function BusyProvider({ children }) {
  const [keys, setKeys] = useState(() => new Set());
  const seq = useRef(0);

  const setBusy = useCallback((key, on) => {
    setKeys(prev => {
      if (on === prev.has(key)) return prev;
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      return next;
    });
  }, []);

  const withBusy = useCallback(async (fn) => {
    const key = `job-${++seq.current}`;
    setBusy(key, true);
    try {
      return await fn();
    } finally {
      setBusy(key, false);
    }
  }, [setBusy]);

  const isBusy = keys.size > 0;
  const value = useMemo(() => ({ withBusy, setBusy, isBusy }), [withBusy, setBusy, isBusy]);

  return (
    <BusyContext.Provider value={value}>
      {children}
      {isBusy && (
        <div className="busy-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="spinner busy-overlay-spinner" />
          <span className="busy-overlay-sr">{t('Please wait…')}</span>
        </div>
      )}
    </BusyContext.Provider>
  );
}

export const useBusy = () => useContext(BusyContext);
