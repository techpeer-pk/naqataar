import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import Modal from '../superadmin/Modal';
import { CANCEL_REASON_OTHER, CANCEL_REASON_MAX } from '../../utils/cancelReasons';
import './CancelReasonDialog.css';

/**
 * Preset-reason picker + "Other" free text. Reports the final reason string
 * through onChange ('' until a preset is picked, or while "Other" is still
 * empty). Used on its own inside AppointmentDetailModal's type-"cancel" step,
 * and wrapped by CancelReasonDialog everywhere else.
 */
export function CancelReasonFields({ presets, required = false, onChange, resetKey }) {
  const [preset, setPreset] = useState('');
  const [other, setOther]   = useState('');

  useEffect(() => { setPreset(''); setOther(''); }, [resetKey]);

  useEffect(() => {
    onChange(preset === CANCEL_REASON_OTHER ? other.trim() : preset);
  }, [preset, other]);

  return (
    <div className="cancel-reason-fields">
      <label className="form-label">
        Reason for cancelling {required ? '*' : <span className="text-muted">(optional)</span>}
      </label>
      <div className="cancel-reason-options">
        {presets.map(p => (
          <button
            key={p}
            type="button"
            className={`cancel-reason-chip${preset === p ? ' active' : ''}`}
            onClick={() => setPreset(prev => prev === p ? '' : p)}
          >
            {p}
          </button>
        ))}
      </div>
      {preset === CANCEL_REASON_OTHER && (
        <textarea
          className="form-control cancel-reason-other"
          autoFocus
          rows={2}
          maxLength={CANCEL_REASON_MAX}
          value={other}
          onChange={e => setOther(e.target.value)}
          placeholder="Tell us briefly why…"
        />
      )}
    </div>
  );
}

/**
 * Cancel confirmation with a reason — replaces the plain window.confirm()
 * on every cancel path that had one. `required` gates the Confirm button
 * until a reason is given (business/Ops/SuperAdmin side); customers may
 * leave it blank. onConfirm receives the reason string ('' if none).
 */
export default function CancelReasonDialog({ open, title = 'Cancel', message, presets, required = false, loading = false, onConfirm, onClose }) {
  const [reason, setReason] = useState('');

  useEffect(() => { if (!open) setReason(''); }, [open]);

  const canConfirm = !loading && (!required || reason.length > 0);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="cancel-reason-dialog">
        {message && <p className="cancel-reason-message">{message}</p>}
        <CancelReasonFields presets={presets} required={required} onChange={setReason} resetKey={open} />
        <div className="cancel-reason-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>
            Never mind
          </button>
          <button type="button" className="btn btn-danger btn-sm" disabled={!canConfirm} onClick={() => onConfirm(reason)}>
            {loading ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><X size={14} /> Confirm Cancel</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
