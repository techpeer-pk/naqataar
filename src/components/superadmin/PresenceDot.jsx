import { useIsOnline } from '../../hooks/usePresence';

/** Live green/gray dot — SuperAdmin-only, backed by RTDB presence. */
export default function PresenceDot({ uid }) {
  const online = useIsOnline(uid);
  if (!uid) return null;
  return (
    <span
      className={`presence-dot ${online ? 'presence-online' : 'presence-offline'}`}
      title={online ? 'Online' : 'Offline'}
    />
  );
}
