import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Save, Building2, ImagePlus, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { accountRef, formatDate } from '../../utils/format';
import LogoCropModal from '../../components/shared/LogoCropModal';
// 2026-11-17: Basic Information is editable by the business owner again —
// same validation as /admin/register (docs/UI-Field-Validation.md).
import {
  isValidLocalPhoneDigits, toFullPhone, stripCountryCode, PH_LOCAL_PHONE_LEN,
  isValidBusinessName, BUSINESS_NAME_MAX, ADDRESS_MAX,
} from '../../utils/validation';

const DESCRIPTION_MAX = 300;
const ROOMS_MAX = 1000;
const PRICE_MAX = 10000000; // PKR

/** Basic-information checks — returns the first problem or ''. */
function basicInfoError(form, isPoolType) {
  if (!isValidBusinessName(form.name)) return `Business name must be 2–${BUSINESS_NAME_MAX} characters.`;
  if ((form.address || '').trim().length > ADDRESS_MAX) return `Address can be at most ${ADDRESS_MAX} characters.`;
  if ((form.description || '').length > DESCRIPTION_MAX) return `Description can be at most ${DESCRIPTION_MAX} characters.`;
  if (!isValidLocalPhoneDigits(form.phone)) return `Enter a valid ${PH_LOCAL_PHONE_LEN}-digit phone number after +92 (e.g. 3001234567).`;
  if (isPoolType) {
    const rooms = Number(form.totalRooms);
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > ROOMS_MAX) return `Total must be a whole number from 1 to ${ROOMS_MAX}.`;
    const price = Number(form.pricePerNight);
    if (form.pricePerNight !== '' && form.pricePerNight != null && (!Number.isFinite(price) || price < 0 || price > PRICE_MAX)) return `Price must be between 0 and ${PRICE_MAX.toLocaleString()}.`;
  }
  return '';
}

// Same normalisation as AdminRegister: digits only; a pasted "+92 300…",
// "92300…" or "0300…" keeps just the 10-digit local part.
function normaliseLocalPhone(raw) {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('92') && d.length > PH_LOCAL_PHONE_LEN) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, PH_LOCAL_PHONE_LEN);
}
import './ProfilePage.css';
import './Dashboard.css';

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

export default function ProfilePage() {
  const { user, userProfile, updateUserProfile, isGoogleUser, changePassword } = useAuth();
  const { fetchByAdmin, fetchOne, update } = useBusinesses();
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({});
  const [hours, setHours] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    setDisplayName(userProfile?.displayName || user?.displayName || '');
  }, [userProfile, user]);

  useEffect(() => {
    const load = async () => {
      let biz = userProfile?.businessId ? await fetchOne(userProfile.businessId) : await fetchByAdmin(userProfile?.uid);
      if (biz) {
        setBusiness(biz);
        setForm({
          // name: biz.name, description: biz.description || '', address: biz.address || '', phone: biz.phone || '',
          // 2026-11-17: phone edited as the 10-digit local part next to a fixed +92 badge
          name: biz.name, description: biz.description || '', address: biz.address || '', phone: stripCountryCode(biz.phone || ''),
          slotDuration: biz.slotDuration || 30, slotCapacity: biz.slotCapacity || 1,
          totalRooms: biz.totalRooms || 5, pricePerNight: biz.pricePerNight ?? '',
          requiresAdvancePayment: biz.requiresAdvancePayment || false,
          offersBooking: biz.offersBooking === true, offersPickup: biz.offersPickup !== false,
          showWorkingHours: biz.showWorkingHours !== false,
          bankName: biz.bankName || '', accountTitle: biz.accountTitle || '', accountNumber: biz.accountNumber || '',
        });
        setHours(biz.workingHours || {});
        setLogoUrl(biz.logo || null);
      }
      setLoading(false);
    };
    if (userProfile) load();
  }, [userProfile]);

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  // Uploads and saves immediately (like an avatar photo) rather than waiting
  // for "Save Profile" — a logo change shouldn't get lost if the admin
  // navigates away without touching the rest of the form.
  const handleLogoSave = async (blob) => {
    setUploadingLogo(true);
    try {
      const fileRef = ref(storage, `business-logos/${userProfile.uid}/${Date.now()}.jpg`);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);
      await update(business.id, { logo: url });
      setLogoUrl(url);
      setCropSrc(null);
      toast.success('Logo updated!');
    } catch {
      toast.error('Could not upload logo. Try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const toggleDay = (key) => {
    setHours(h => ({
      ...h,
      [key]: h[key] ? null : { open: '09:00', close: '18:00' },
    }));
  };

  const setDayHour = (key, field, val) => {
    setHours(h => ({ ...h, [key]: { ...h[key], [field]: val } }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!business) return;
    // 2026-11-17: Basic Information is editable again — validate before writing.
    const problem = basicInfoError(form, ['hotel', 'nayasaa', 'beachhuts'].includes(business.type));
    if (problem) { toast.error(problem); return; }
    setSaving(true);
    try {
      await update(business.id, {
        ...form,
        // 2026-11-17: trimmed text + phone stored as "92XXXXXXXXXX" (searched by /find-business)
        name:        form.name.trim().replace(/\s+/g, ' '),
        address:     (form.address || '').trim(),
        description: (form.description || '').trim(),
        phone:       toFullPhone(form.phone),
        slotDuration: Number(form.slotDuration), slotCapacity: Number(form.slotCapacity),
        totalRooms: Number(form.totalRooms), pricePerNight: form.pricePerNight ? Number(form.pricePerNight) : null,
        workingHours: hours,
      });
      const trimmedName = displayName.trim();
      if (trimmedName && trimmedName !== (userProfile?.displayName || user?.displayName || '')) {
        await updateUserProfile({ displayName: trimmedName });
      }
      toast.success('Business profile updated!');
    } catch {
      toast.error('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match.'); return; }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success('Password updated!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="admin-layout page">
      <div className="container profile-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={24} color="var(--primary)" />
            <h1>Business Profile</h1>
          </div>
          <button type="submit" form="profile-form" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

        <form id="profile-form" onSubmit={handleSave}>
          <div className="profile-grid">
            {/* Basic info — read-only 2026-09-11 (on request): SuperAdmin's
            BusinessDetailPage.jsx has the editable equivalent; business
            owners can still see their own info here, just not change it. */}
            {/* 2026-11-17: EDITABLE again for the business owner (user request) —
            fields validated by basicInfoError(); phone uses the +92 scheme. */}
            <div className="card">
              <div className="card-header"><h3>Basic Information</h3></div>
              <div className="card-body">
                {/* <p className="form-hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
                  Contact the Naqatar team to update these details.
                </p> */}
                {/* 2026-11-17: editable by the business owner again (user request). */}
                <p className="form-hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
                  Edit your details and press <strong>Save Profile</strong>. The logo saves as soon as you upload it.
                </p>
                <div className="form-group">
                  <label className="form-label">Business Logo</label>
                  <div className="logo-upload-row">
                    {logoUrl
                      ? <img src={logoUrl} alt="Business logo" className="logo-upload-preview" />
                      : <div className="logo-upload-preview logo-upload-placeholder">{form.name?.[0]?.toUpperCase() || '?'}</div>
                    }
                    {/* 2026-11-17: upload button back (handleLogoFileChange → LogoCropModal → handleLogoSave) */}
                    <label className="btn btn-ghost btn-sm" style={{ cursor: uploadingLogo ? 'wait' : 'pointer' }}>
                      <ImagePlus size={15} /> {uploadingLogo ? 'Uploading…' : (logoUrl ? 'Change Logo' : 'Upload Logo')}
                      <input type="file" accept="image/*" hidden onChange={handleLogoFileChange} disabled={uploadingLogo} />
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Business Name *</label>
                  {/* <input className="form-control" value={form.name || ''} disabled /> */}
                  <input className="form-control" value={form.name || ''} maxLength={BUSINESS_NAME_MAX} required
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  {/* <textarea className="form-control" rows={3} value={form.description || ''} disabled /> */}
                  <textarea className="form-control" rows={3} value={form.description || ''} maxLength={DESCRIPTION_MAX}
                    placeholder="Brief description of your business…"
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  <p className="form-hint" style={{ textAlign: 'right', margin: '0.25rem 0 0' }}>{(form.description || '').length}/{DESCRIPTION_MAX}</p>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    {/* <input className="form-control" value={form.address || ''} disabled /> */}
                    <input className="form-control" value={form.address || ''} maxLength={ADDRESS_MAX} placeholder="Street, City"
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    {/* <label className="form-label">Phone</label>
                    <input className="form-control" type="tel" value={form.phone || ''} disabled /> */}
                    <label className="form-label">Phone *</label>
                    <div className="phone-input-group">
                      <span className="phone-input-prefix">+92</span>
                      <input className="form-control" type="tel" inputMode="numeric" autoComplete="tel-national"
                        placeholder="3001234567" maxLength={PH_LOCAL_PHONE_LEN} required
                        value={form.phone || ''}
                        onChange={e => setForm(f => ({ ...f, phone: normaliseLocalPhone(e.target.value) }))} />
                    </div>
                    <p className="form-hint">Customers find you on Naqatar by this number.</p>
                  </div>
                </div>
                {['hotel', 'nayasaa', 'beachhuts'].includes(business?.type) ? (
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Total Rooms</label>
                      {/* <input className="form-control" type="number" min="1" value={form.totalRooms} disabled /> */}
                      <input className="form-control" type="number" min="1" max={ROOMS_MAX} step="1" inputMode="numeric" value={form.totalRooms}
                        onChange={e => setForm(f => ({ ...f, totalRooms: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      {/* <label className="form-label">Price per Night (optional)</label> */}
                      <label className="form-label">{['nayasaa', 'beachhuts'].includes(business?.type) ? 'Price per Day (optional)' : 'Price per Night (optional)'}</label>
                      {/* <input className="form-control" type="number" min="0" value={form.pricePerNight} disabled /> */}
                      <input className="form-control" type="number" min="0" max={PRICE_MAX} step="1" inputMode="numeric" value={form.pricePerNight}
                        placeholder="e.g. 15000" onChange={e => setForm(f => ({ ...f, pricePerNight: e.target.value }))} />
                    </div>
                  </div>
                ) : (
                  <div className="form-row-2">
                    <div className="form-group">
                      <label className="form-label">Slot Duration (minutes)</label>
                      {/* <select className="form-control" value={form.slotDuration} disabled> */}
                      <select className="form-control" value={form.slotDuration}
                        onChange={e => setForm(f => ({ ...f, slotDuration: Number(e.target.value) }))}>
                        {[15, 20, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} min</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Capacity per Slot</label>
                      {/* <select className="form-control" value={form.slotCapacity} disabled> */}
                      <select className="form-control" value={form.slotCapacity}
                        onChange={e => setForm(f => ({ ...f, slotCapacity: Number(e.target.value) }))}>
                        {[1, 2, 3, 4, 5, 6, 8, 10].map(v => <option key={v} value={v}>{v} {v === 1 ? 'booking' : 'bookings'} at a time</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {/* QunjeeEats fulfillment switches — checkout/business page hide
                    whatever is off. offersPickup missing on old docs = ON. */}
                {business?.offersOrdering === true && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        {/* <input type="checkbox" checked={!!form.offersBooking} disabled /> */}
                        <input type="checkbox" checked={!!form.offersBooking}
                          onChange={e => setForm(f => ({ ...f, offersBooking: e.target.checked }))} />
                        Table Booking / Dine-in pre-orders
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        {/* <input type="checkbox" checked={!!form.offersPickup} disabled /> */}
                        <input type="checkbox" checked={!!form.offersPickup}
                          onChange={e => setForm(f => ({ ...f, offersPickup: e.target.checked }))} />
                        Take Away (self pickup)
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3>Account</h3></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Display Name</label>
                  <input className="form-control" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
                  <p className="form-hint">Shown in the navbar and to Support.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-control" value={user?.email || ''} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Support ID</label>
                  <input className="form-control" value={accountRef(user?.uid)} disabled style={{ fontFamily: 'ui-monospace, monospace' }} />
                  <p className="form-hint">Quote this when you call Support — it helps us confirm it's really you.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Date of Join</label>
                  <input className="form-control" value={formatDate(userProfile?.createdAt) || '—'} disabled />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Working Hours</h3>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.showWorkingHours !== false}
                  className={`toggle-switch ${form.showWorkingHours !== false ? 'on' : ''}`}
                  onClick={() => setForm(f => ({ ...f, showWorkingHours: !f.showWorkingHours }))}
                  title={form.showWorkingHours !== false ? 'Shown on your public page' : 'Hidden from your public page'}
                >
                  <span className="toggle-switch-knob" />
                </button>
              </div>
              <div className="card-body hours-editor">
                {DAYS.map(({ key, label }) => (
                  <div key={key} className="hours-row-edit">
                    <label className="hours-day-toggle">
                      <input type="checkbox" checked={!!hours[key]} onChange={() => toggleDay(key)} />
                      <span>{label}</span>
                    </label>
                    {hours[key] ? (
                      <div className="hours-inputs">
                        <input type="time" className="form-control time-input" value={hours[key]?.open || '09:00'} onChange={e => setDayHour(key, 'open', e.target.value)} />
                        <span>–</span>
                        <input type="time" className="form-control time-input" value={hours[key]?.close || '18:00'} onChange={e => setDayHour(key, 'close', e.target.value)} />
                      </div>
                    ) : (
                      <span className="closed-label">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Advance payment (anti-spam) — on/off toggle lives on the Dashboard */}
            <div className="card">
              <div className="card-header"><h3>Advance Payment</h3></div>
              <div className="card-body">
                <p className="form-hint" style={{ marginBottom: '1rem' }}>
                  Currently <strong>{form.requiresAdvancePayment ? 'ON' : 'OFF'}</strong> — toggle this from the{' '}
                  <Link to="/admin/dashboard">Dashboard</Link>. When on, customers must upload a bank-transfer
                  screenshot before their booking is created, using the bank details below.
                </p>
                {form.requiresAdvancePayment && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Bank Name</label>
                      <input className="form-control" value={form.bankName || ''} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Title</label>
                      <input className="form-control" value={form.accountTitle || ''} onChange={e => setForm(f => ({ ...f, accountTitle: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Account Number</label>
                      <input className="form-control" value={form.accountNumber || ''} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
                    </div>
                    <p className="form-hint">The amount shown to customers is each service's listed price.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Own <form> + submit handler, kept outside #profile-form above —
            HTML forms can't nest, and a password change is its own action
            with its own success/error toasts, not part of "Save Profile". */}
        {!isGoogleUser() && (
          <div className="profile-grid" style={{ marginTop: '1.5rem' }}>
            <div className="card">
              <div className="card-header"><h3><KeyRound size={16} /> Change Password</h3></div>
              <form onSubmit={handleChangePassword} className="card-body">
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input className="form-control" type="password" value={pwForm.current}
                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-control" type="password" minLength={6} value={pwForm.next}
                    onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-control" type="password" minLength={6} value={pwForm.confirm}
                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                  {pwSaving ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {cropSrc && (
        <LogoCropModal
          imageSrc={cropSrc}
          onCancel={() => setCropSrc(null)}
          onSave={handleLogoSave}
        />
      )}
    </div>
  );
}
