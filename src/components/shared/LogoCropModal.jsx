import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, RotateCw, ZoomIn } from 'lucide-react';
import { getCroppedImageBlob } from '../../utils/cropImage';
import './LogoCropModal.css';

// Default 1:1 output — reused for business logos and menu-item photos so both
// render consistently wherever they're shown, regardless of what was uploaded.
// `aspect` can be overridden (e.g. ad banners use a wide 1600:534 ratio).
export default function LogoCropModal({ imageSrc, onCancel, onSave, title = 'Crop Logo', saveLabel = 'Save Logo', aspect = 1, mimeType = 'image/jpeg' }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation, mimeType);
      await onSave(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="logo-crop-overlay" onClick={onCancel}>
      <div className="logo-crop-box" onClick={e => e.stopPropagation()}>
        <div className="logo-crop-header">
          <h3>{title}</h3>
          <button type="button" className="logo-crop-close" onClick={onCancel}><X size={18} /></button>
        </div>

        <div className="logo-crop-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape="rect"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="logo-crop-controls">
          <label className="logo-crop-control">
            <ZoomIn size={15} />
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
          </label>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRotation(r => (r + 90) % 360)}>
            <RotateCw size={14} /> Rotate
          </button>
        </div>

        <div className="logo-crop-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
