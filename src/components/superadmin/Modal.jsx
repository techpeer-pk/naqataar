import { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

/** Generic centered popup dialog for the SuperAdmin console's create/edit forms. */
export default function Modal({ open, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sa-modal-backdrop" onClick={onClose}>
      <div className={`sa-modal card fade-up ${className}`} onClick={e => e.stopPropagation()}>
        <div className="card-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
}
