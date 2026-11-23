import { useEffect, useState } from 'react';
import { QrCode, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { clinicQrUrl, tokenQrUrl } from '../../utils/clinicQr';
import './ClinicQrCard.css';
import { t } from '../../i18n';

const QR_COLOR = '#1D565D'; // Naqatar teal

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Wording per poster. English source text = i18n key (see src/i18n).
const VARIANTS = {
  booking: {
    url: clinicQrUrl, file: 'naqatar-qr',
    title: 'Your clinic QR code',
    sub: 'Put this in your waiting room or at reception. Patients scan it and your clinic page opens straight away to book.',
    lead: 'Scan to book your appointment',
    steps: ['Open your phone camera or the Naqatar app', 'Scan this QR code', 'Pick a service and a time, and book'],
  },
  // 2026-11-23: token poster — opens /index/businessDOTS/:id directly.
  token: {
    url: tokenQrUrl, file: 'naqatar-token-qr',
    title: 'Token QR code',
    sub: 'Put this at the entrance or reception. Patients scan it, enter their name and mobile, and get a token. No login.',
    lead: 'Scan to get your token',
    steps: ['Open your phone camera or the Naqatar app', 'Scan this QR code', 'Enter your name and mobile, and get your token'],
  },
};

// Clinic-owner QR card (2026-11-20): the clinic's own QR, to download or
// print as a poster. Patients scan it from the home page scanner, or with
// the normal phone camera. variant 'booking' (Dashboard) opens the clinic
// page; variant 'token' (/admin/tokens) opens the token page.
export default function ClinicQrCard({ business, variant = 'booking' }) {
  const [dataUrl, setDataUrl] = useState('');
  const v = VARIANTS[variant] || VARIANTS.booking;
  const url = v.url(business.id);

  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(url, {
        width: 1024, margin: 2, errorCorrectionLevel: 'M',
        color: { dark: QR_COLOR, light: '#FFFFFF' },
      }))
      .then(d => { if (alive) setDataUrl(d); })
      .catch(() => { if (alive) toast.error(t('Could not create the QR code.')); });
    return () => { alive = false; };
  }, [url]);

  const slug = (business.name || 'clinic').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clinic';

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${v.file}-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) { toast.error(t('Allow pop-ups for this site to print the poster.')); return; }
    const logo = `${window.location.origin}/brand/naqatar-logo.png`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(business.name)} QR</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Poppins', Arial, sans-serif; color: #123F4C; text-align: center; }
  .poster { border: 3px solid ${QR_COLOR}; border-radius: 18px; padding: 10mm 12mm; min-height: 265mm;
            display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
  .logo { height: 28mm; }
  h1 { font-size: 30pt; margin: 4mm 0 0; color: ${QR_COLOR}; }
  .lead { font-size: 22pt; font-weight: 700; margin: 6mm 0 2mm; }
  .qr { width: 120mm; height: 120mm; }
  ol { text-align: left; font-size: 15pt; line-height: 1.7; margin: 4mm auto; padding-left: 8mm; }
  .foot { font-size: 12pt; color: #A9873F; font-weight: 600; }
</style></head><body>
<div class="poster">
  <div>
    <img class="logo" src="${logo}" alt="Naqatar">
    <h1>${escapeHtml(business.name)}</h1>
  </div>
  <p class="lead">${escapeHtml(t(v.lead))}</p>
  <img class="qr" src="${dataUrl}" alt="QR">
  <ol>
    ${v.steps.map(s => `<li>${escapeHtml(t(s))}</li>`).join('\n    ')}
  </ol>
  <p class="foot">naqatar.web.app</p>
</div>
<script>
  var imgs = Array.prototype.slice.call(document.images);
  Promise.all(imgs.map(function (i) { return i.complete ? 0 : new Promise(function (r) { i.onload = i.onerror = r; }); }))
    .then(function () { window.focus(); window.print(); });
</script>
</body></html>`);
    w.document.close();
  };

  return (
    <div className="card clinic-qr-card">
      <div className="card-body clinic-qr-inner">
        <div className="clinic-qr-img">
          {dataUrl ? <img src={dataUrl} alt={t('QR code for {name}', { name: business.name })} /> : <QrCode size={48} />}
        </div>
        <div className="clinic-qr-info">
          <p className="clinic-qr-title">{t(v.title)}</p>
          <p className="text-muted clinic-qr-sub">{t(v.sub)}</p>
          <div className="clinic-qr-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint} disabled={!dataUrl}>
              <Printer size={15} /> {t('Print poster')}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleDownload} disabled={!dataUrl}>
              <Download size={15} /> {t('Download QR')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
