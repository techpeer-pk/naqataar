import { AlertTriangle } from 'lucide-react';
import { suggestEmailFix } from '../../utils/emailTypo';

// Renders nothing until the typed email's domain matches a known typo, then
// shows a one-tap fix under the input. Place directly below an email field.
export default function EmailTypoHint({ email, onFix }) {
  const fixed = suggestEmailFix(email);
  if (!fixed) return null;
  return (
    <button
      type="button"
      onClick={() => onFix(fixed)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.45rem',
        background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A',
        borderRadius: '8px', padding: '0.45rem 0.65rem', fontSize: '0.82rem',
        cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', width: '100%',
      }}
    >
      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
      <span>Did you mean <strong>{fixed}</strong>? Tap to fix.</span>
    </button>
  );
}
