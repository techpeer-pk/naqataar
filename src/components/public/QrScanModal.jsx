import { useEffect, useRef, useState } from 'react';
import { X, CameraOff } from 'lucide-react';
import './QrScanModal.css';
import { t } from '../../i18n';

const READER_ID = 'qr-scan-reader';

// Camera QR scanner (home page → "Clinic number" box). html5-qrcode is
// loaded only when the modal opens, so the home page bundle stays small.
// It decodes in JS, so it also works on iPhone Safari, which has no
// built-in BarcodeDetector.
export default function QrScanModal({ onResult, onClose }) {
  const [error, setError] = useState('');
  const doneRef = useRef(false);

  useEffect(() => {
    let scanner = null;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        scanner = new Html5Qrcode(READER_ID, { verbose: false });
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; } },
          (text) => {
            if (doneRef.current) return;
            doneRef.current = true;
            onResult(text);
          },
          () => {}, // "no QR in this frame" — fires constantly, ignore
        );
        if (cancelled) scanner.stop().catch(() => {});
      } catch (e) {
        if (cancelled) return;
        const denied = /permission|notallowed/i.test(`${e?.name} ${e?.message ?? e}`);
        setError(denied
          ? t('Camera permission was denied. Allow camera access in your browser settings and try again.')
          : t('Could not open the camera on this device.'));
      }
    })();

    return () => {
      cancelled = true;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, [onResult]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="qrs-overlay" onClick={onClose}>
      <div className="qrs-card" role="dialog" aria-modal="true" aria-labelledby="qrs-title" onClick={e => e.stopPropagation()}>
        <button className="qrs-close" onClick={onClose} aria-label={t('Close')}><X size={18} /></button>
        <h3 id="qrs-title" className="qrs-title">{t('Scan clinic QR')}</h3>
        <p className="qrs-sub">{t("Point the camera at the QR code on the clinic's poster.")}</p>
        {error ? (
          <div className="qrs-error" role="alert">
            <CameraOff size={28} />
            <p>{error}</p>
          </div>
        ) : (
          <div id={READER_ID} className="qrs-reader" />
        )}
        <button className="btn btn-ghost qrs-cancel" onClick={onClose}>{t('Cancel')}</button>
      </div>
    </div>
  );
}
