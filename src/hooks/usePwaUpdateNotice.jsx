import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useRegisterSW } from 'virtual:pwa-register/react';

// registerType: 'autoUpdate' (vite.config.js) already installs+activates a
// new service worker automatically on the user's NEXT visit/reload — no
// action needed for the vast majority of the ~5k-user rollout case. The one
// gap this closes: a tab that's already open when a deploy goes out stays on
// the OLD app version until the user happens to navigate/reload it
// themselves. This surfaces that moment instead of leaving it to chance.
//
// Defensive by design: registration/update errors are swallowed (logged,
// never surfaced to the user as a toast — a failed *check* for updates isn't
// something the user can act on, and must never block or crash the app
// they're already using). The toast itself only ever appears on the
// deliberate `needRefresh` signal, and reload is user-initiated (clicking
// the toast action), never automatic — an unprompted reload mid-session
// would be its own kind of crash from the user's point of view.
export function usePwaUpdateNotice() {
  const toastShown = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // eslint-disable-next-line no-console
      console.error('PWA service worker registration failed:', error);
    },
  });

  useEffect(() => {
    if (!needRefresh || toastShown.current) return;
    toastShown.current = true;
    toast(
      (t) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          A new version is available.
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              toast.dismiss(t.id);
              updateServiceWorker(true);
            }}
          >
            Reload
          </button>
        </span>
      ),
      { duration: Infinity, id: 'pwa-update-notice' }
    );
  }, [needRefresh, updateServiceWorker]);
}
