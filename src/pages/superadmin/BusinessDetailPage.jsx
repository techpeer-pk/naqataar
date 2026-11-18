import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, query, where, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { format } from 'date-fns';
import { Save, Plus, Edit2, Trash2, X, Clock, DollarSign, ArrowLeft, ImagePlus, User, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { db, auth, storage } from '../../firebase';
import LogoCropModal from '../../components/shared/LogoCropModal';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useServices } from '../../hooks/useServices';
import { useAdminSlots } from '../../hooks/useAdminSlots';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useUsers } from '../../hooks/useUsers';
import { useInvoices } from '../../hooks/useInvoices';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { subscriptionStatus } from '../../utils/subscription';
import { invoiceRef } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import MonthCalendarPicker from '../../components/superadmin/MonthCalendarPicker';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';
import '../admin/ProfilePage.css';
import '../admin/ServicesPage.css';
import '../admin/Dashboard.css';
import './BusinessDetailPage.css';

// Fixed monthly fee, same for every business — matches the pitch deck's
// PKR 15,000/month (docs/Qunjee Eats - Pitch Deck.pdf); see also
// docs/Billing-Subscription.md. Editable by SuperAdmin below (config/
// billingSettings) — this is only the fallback until that doc exists.
const DEFAULT_SUBSCRIPTION_FEE = 15000;

const DAYS = [
  { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' }, { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' }, { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' }, { key: 'sun', label: 'Sunday' },
];
const EMPTY_SERVICE = { name: '', description: '', duration: 30, price: '', totalRooms: 1, image: null };

// Best-effort — a service is never blocked on Storage cleanup succeeding.
async function tryDeleteImage(url) {
  if (!url) return;
  try { await deleteObject(ref(storage, url)); } catch { /* orphaned file is harmless */ }
}

export default function BusinessDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchOne, update, remove: removeBusiness } = useBusinesses();
  const { services, loading: servicesLoading, fetchAll: fetchServices, create: createService, update: updateService, remove: removeService } = useServices(id);
  const { slots, loading: slotsLoading, fetchByBusiness, remove: removeSlot } = useAdminSlots();
  const { log } = useAuditLog();
  const { update: updateUser } = useUsers();
  const { create: createInvoice } = useInvoices();
  const { sendInvoice } = useEmailNotifications();

  const [business, setBusiness] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('details');

  const [form, setForm]   = useState({});
  const [hours, setHours] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [showSvcForm, setShowSvcForm] = useState(false);
  const [svcEditId, setSvcEditId]     = useState(null);
  const [svcForm, setSvcForm]         = useState(EMPTY_SERVICE);
  const [svcSaving, setSvcSaving]     = useState(false);
  const [svcCropSrc, setSvcCropSrc]   = useState(null);

  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting]       = useState(false);

  const [activeUntilDraft, setActiveUntilDraft] = useState(null);
  const [subSaving, setSubSaving] = useState(false);

  // Monthly subscription fee — global, not per-business (see docs/Billing-
  // Subscription.md: "same fixed fee" model). Lives in a single config doc
  // rather than hardcoded so a price change doesn't need a code deploy.
  const [subscriptionFee, setSubscriptionFee] = useState(DEFAULT_SUBSCRIPTION_FEE);
  const [feeDraft, setFeeDraft]   = useState('');
  const [feeSaving, setFeeSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'config', 'billingSettings')).then(snap => {
      const fee = snap.exists() ? snap.data().subscriptionFee : null;
      if (fee != null) { setSubscriptionFee(fee); setFeeDraft(String(fee)); }
      else setFeeDraft(String(DEFAULT_SUBSCRIPTION_FEE));
    });
  }, []);

  const handleSaveFee = async () => {
    const fee = Number(feeDraft);
    if (!fee || fee <= 0) return;
    setFeeSaving(true);
    try {
      await setDoc(doc(db, 'config', 'billingSettings'), { subscriptionFee: fee }, { merge: true });
      await log({ action: 'update', targetCollection: 'config', docId: 'billingSettings', summary: `Subscription fee → PKR ${fee.toLocaleString()}` });
      setSubscriptionFee(fee);
      toast.success(`Monthly fee set to PKR ${fee.toLocaleString()}.`);
    } catch {
      toast.error('Save failed.');
    } finally {
      setFeeSaving(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const biz = await fetchOne(id);
      if (biz) {
        setBusiness(biz);
        setForm({ name: biz.name, description: biz.description || '', address: biz.address || '', phone: biz.phone || '', slotDuration: biz.slotDuration || 30, slotCapacity: biz.slotCapacity || 1, totalRooms: biz.totalRooms || 5, pricePerNight: biz.pricePerNight ?? '', offersBooking: biz.offersBooking === true, offersPickup: biz.offersPickup !== false, showWorkingHours: biz.showWorkingHours !== false });
        setHours(biz.workingHours || {});
        setLogoUrl(biz.logo || null);
        setActiveUntilDraft(biz.activeUntil?.toDate?.() || null);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    if (tab === 'services') fetchServices();
    if (tab === 'slots') fetchByBusiness(id);
  }, [tab, id]);

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const handleLogoSave = async (blob) => {
    setUploadingLogo(true);
    try {
      const fileRef = ref(storage, `business-logos/${auth.currentUser.uid}/${Date.now()}.jpg`);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);
      await update(id, { logo: url });
      setLogoUrl(url);
      setCropSrc(null);
      await log({ action: 'update', targetCollection: 'businesses', docId: id, summary: `${business.name}: logo updated` });
      toast.success('Logo updated!');
    } catch {
      toast.error('Could not upload logo. Try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    setUploadingLogo(true);
    try {
      await tryDeleteImage(logoUrl);
      await update(id, { logo: null });
      setLogoUrl(null);
      await log({ action: 'update', targetCollection: 'businesses', docId: id, summary: `${business.name}: logo removed` });
      toast.success('Logo removed.');
    } catch {
      toast.error('Could not remove logo. Try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const toggleDay = (key) => setHours(h => ({ ...h, [key]: h[key] ? null : { open: '09:00', close: '18:00' } }));
  const setDayHour = (key, field, val) => setHours(h => ({ ...h, [key]: { ...h[key], [field]: val } }));

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update(id, {
        ...form,
        slotDuration: Number(form.slotDuration), slotCapacity: Number(form.slotCapacity),
        totalRooms: Number(form.totalRooms), pricePerNight: form.pricePerNight ? Number(form.pricePerNight) : null,
        workingHours: hours,
      });
      await log({ action: 'update', targetCollection: 'businesses', docId: id, summary: `${form.name}: details updated` });
      toast.success('Business updated.');
    } catch {
      toast.error('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    const next = !business.isActive;
    await update(id, { isActive: next });
    await log({ action: 'update', targetCollection: 'businesses', docId: id, summary: `${business.name}: ${next ? 'reactivated' : 'deactivated'}` });
    setBusiness(b => ({ ...b, isActive: next }));
    toast.success(next ? 'Business reactivated.' : 'Business deactivated.');
  };

  // Manual subscription — see docs/Billing-Subscription.md. SuperAdmin sets
  // this after confirming an off-app (WhatsApp) payment; it only extends how
  // long the business can receive NEW bookings/orders (firestore.rules'
  // isSubscriptionActive) — nothing else about the business is touched.
  // Every save issues an invoice record — the paid period runs from
  // whichever the business already had (a prior activeUntil, or the end of
  // their free trial) through the new date being set.
  const handleSaveSubscription = async () => {
    if (!activeUntilDraft) return;
    setSubSaving(true);
    try {
      const activeUntil = Timestamp.fromDate(activeUntilDraft);
      const periodStart = business.activeUntil || business.trialEndsAt || null;
      await update(id, { activeUntil });
      const invoiceId = await createInvoice({
        businessId:  id,
        businessName: business.name,
        amount:      subscriptionFee,
        periodStart,
        periodEnd:   activeUntil,
        createdBy:   auth.currentUser?.uid || null,
      });
      await sendInvoice({
        businessName: business.name,
        businessEmail: business.email || '',
        invoiceRef:   invoiceRef(invoiceId),
        amount:       subscriptionFee,
        periodStart:  periodStart?.toDate ? periodStart.toDate() : periodStart,
        periodEnd:    activeUntilDraft,
      });
      await log({ action: 'update', targetCollection: 'businesses', docId: id, summary: `${business.name}: subscription active until ${format(activeUntilDraft, 'd MMM yyyy')}, invoice ${invoiceRef(invoiceId)}` });
      setBusiness(b => ({ ...b, activeUntil }));
      toast.success(`Subscription updated — invoice ${invoiceRef(invoiceId)} issued.`);
    } catch {
      toast.error('Save failed.');
    } finally {
      setSubSaving(false);
    }
  };

  // Services
  const openNewSvc  = () => { setSvcForm(EMPTY_SERVICE); setSvcEditId(null); setShowSvcForm(true); };
  const openEditSvc = (s) => { setSvcForm({ name: s.name, description: s.description || '', duration: s.duration, price: s.price || '', totalRooms: s.totalRooms ?? 1, image: s.image || null }); setSvcEditId(s.id); setShowSvcForm(true); };
  const closeSvcForm = () => { setShowSvcForm(false); setSvcEditId(null); setSvcForm(EMPTY_SERVICE); };

  const handleSvcImageFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSvcCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  // Uploaded under the SuperAdmin's own uid (not the owner's) — matches how
  // handleLogoSave above already writes to business-logos/{auth uid}/..., since
  // storage.rules gates the write path by whoever is actually signed in.
  const handleSvcImageCropSave = async (blob) => {
    const fileRef = ref(storage, `service-images/${auth.currentUser.uid}/${Date.now()}.jpg`);
    await uploadBytes(fileRef, blob);
    const url = await getDownloadURL(fileRef);
    await tryDeleteImage(svcForm.image);   // replacing — drop the old file
    setSvcForm(f => ({ ...f, image: url }));
    setSvcCropSrc(null);
  };

  const handleRemoveSvcImage = async () => {
    await tryDeleteImage(svcForm.image);
    setSvcForm(f => ({ ...f, image: null }));
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setSvcSaving(true);
    try {
      const data = business.type === 'hotel'
        ? { name: svcForm.name, description: svcForm.description, price: svcForm.price ? Number(svcForm.price) : null, totalRooms: Number(svcForm.totalRooms) || 1, image: svcForm.image }
        : { ...svcForm, duration: Number(svcForm.duration), price: svcForm.price ? Number(svcForm.price) : null };
      if (svcEditId) {
        await updateService(svcEditId, data);
        await log({ action: 'update', targetCollection: 'services', docId: svcEditId, summary: `${business.name} → ${data.name}` });
      } else {
        const newId = await createService(data);
        await log({ action: 'create', targetCollection: 'services', docId: newId, summary: `${business.name} → ${data.name}` });
      }
      toast.success(svcEditId ? 'Service updated.' : 'Service added.');
      closeSvcForm();
    } catch {
      toast.error('Failed to save service.');
    } finally {
      setSvcSaving(false);
    }
  };

  const handleDeleteService = async (svcId, svcName) => {
    if (!confirm('Delete this service?')) return;
    const svc = services.find(s => s.id === svcId);
    await removeService(svcId);
    await tryDeleteImage(svc?.image);
    await log({ action: 'delete', targetCollection: 'services', docId: svcId, summary: `${business.name} → ${svcName}` });
    toast.success('Service deleted.');
  };

  const handleToggleOnTop = async (svc) => {
    const onTop = !svc.onTop;
    await updateService(svc.id, { onTop });
    await log({ action: 'update', targetCollection: 'services', docId: svc.id, summary: `${business.name} → ${svc.name} (${onTop ? 'pinned to top' : 'unpinned'})` });
    toast.success(onTop ? 'Pinned to top.' : 'Unpinned.');
  };

  // Slots
  const handleDeleteSlot = async (slotDocId) => {
    if (!confirm('Delete this slot lock? This frees the capacity it was holding.')) return;
    await removeSlot(id, slotDocId);
    await log({ action: 'delete', targetCollection: 'slots', docId: slotDocId, summary: `${business.name} → ${slotDocId}` });
    toast.success('Slot lock deleted.');
  };

  // Cascading hard-delete
  const handleHardDelete = async () => {
    if (confirmName !== business.name) return;
    setDeleting(true);
    try {
      const [svcSnap, slotSnap, apptSnap, nightSnap, resvSnap] = await Promise.all([
        getDocs(collection(db, 'businesses', id, 'services')),
        getDocs(collection(db, 'businesses', id, 'slots')),
        getDocs(query(collection(db, 'appointments'), where('businessId', '==', id))),
        getDocs(collection(db, 'businesses', id, 'roomNights')),
        getDocs(query(collection(db, 'reservations'), where('businessId', '==', id))),
      ]);
      // Hotel room types nest their own room-night pool one level deeper
      // (businesses/{id}/services/{serviceId}/roomNights) — Firestore never
      // cascade-deletes subcollections, so each one has to be enumerated and
      // cleared here too, or it's orphaned data forever once the parent
      // service doc (and business) are gone.
      const svcNightSnaps = await Promise.all(
        svcSnap.docs.map(d => getDocs(collection(db, 'businesses', id, 'services', d.id, 'roomNights')))
      );
      await Promise.all([
        ...svcSnap.docs.map(d => deleteDoc(d.ref)),
        ...slotSnap.docs.map(d => deleteDoc(d.ref)),
        ...apptSnap.docs.map(d => deleteDoc(d.ref)),
        ...nightSnap.docs.map(d => deleteDoc(d.ref)),
        ...resvSnap.docs.map(d => deleteDoc(d.ref)),
        ...svcNightSnaps.flatMap(snap => snap.docs.map(d => deleteDoc(d.ref))),
      ]);
      await removeBusiness(id);
      // Clear the dangling users/{adminUid}.businessId back-reference so the
      // admin's own profile doesn't still point at a now-deleted business.
      // Best-effort: the admin's account may itself have been deleted already.
      try { await updateUser(business.adminUid, { businessId: null }); } catch { /* admin doc may not exist */ }
      const svcNightCount = svcNightSnaps.reduce((sum, snap) => sum + snap.size, 0);
      await log({ action: 'delete', targetCollection: 'businesses', docId: id, summary: `${business.name} (cascaded ${svcSnap.size} services, ${slotSnap.size} slots, ${apptSnap.size} appointments, ${nightSnap.size + svcNightCount} room-nights, ${resvSnap.size} reservations, cleared admin businessId)` });
      toast.success('Business permanently deleted.');
      navigate('/superadmin/businesses');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!business) return <div className="empty-state"><p>Business not found.</p></div>;

  const subStatus = subscriptionStatus(business);

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/superadmin/businesses')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={14} /> Back to Businesses
      </button>

      <div className="dashboard-header">
        <div>
          <h1>{business.name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {business.type} · <span className={`badge badge-${business.isActive ? 'confirmed' : 'cancelled'}`}>{business.isActive ? 'Active' : 'Inactive'}</span>
            {' · '}
            <span className={`badge badge-${subStatus.active ? 'confirmed' : 'cancelled'}`}>
              {subStatus.kind === 'legacy' ? 'Legacy — always active'
                : subStatus.kind === 'trial' ? `Trial until ${format(subStatus.until, 'd MMM yyyy')}`
                : subStatus.kind === 'subscribed' ? `Subscribed until ${format(subStatus.until, 'd MMM yyyy')}`
                : 'Subscription expired'}
            </span>
          </p>
        </div>
      </div>

      <div className="status-filter-tabs" style={{ marginBottom: '1.25rem' }}>
        <button className={`status-tab ${tab === 'details' ? 'active' : ''}`} onClick={() => setTab('details')}>Details</button>
        <button className={`status-tab ${tab === 'services' ? 'active' : ''}`} onClick={() => setTab('services')}>Services</button>
        <button className={`status-tab ${tab === 'slots' ? 'active' : ''}`} onClick={() => setTab('slots')}>Slots</button>
        <button className={`status-tab ${tab === 'subscription' ? 'active' : ''}`} onClick={() => setTab('subscription')}>Subscription</button>
        <button className={`status-tab ${tab === 'danger' ? 'active' : ''}`} onClick={() => setTab('danger')}>Danger Zone</button>
      </div>

      {tab === 'details' && (
        <form onSubmit={handleSaveDetails}>
          <div className="profile-grid">
            <div className="card">
              <div className="card-header"><h3>Basic Information</h3></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Business Logo</label>
                  <div className="logo-upload-row">
                    {logoUrl
                      ? <img src={logoUrl} alt="Business logo" className="logo-upload-preview" />
                      : <div className="logo-upload-preview logo-upload-placeholder">{business.name?.[0]?.toUpperCase() || '?'}</div>
                    }
                    <label className="btn btn-ghost btn-sm">
                      <ImagePlus size={15} /> {logoUrl ? 'Change Logo' : 'Upload Logo'}
                      <input type="file" accept="image/*" hidden onChange={handleLogoFileChange} disabled={uploadingLogo} />
                    </label>
                    {logoUrl && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveLogo} disabled={uploadingLogo}>
                        <X size={15} /> Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Business Name *</label>
                  <input className="form-control" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={3} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                {business.type === 'hotel' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Total Rooms</label>
                      <input className="form-control" type="number" min="1"
                        value={form.totalRooms} onChange={e => setForm(f => ({ ...f, totalRooms: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Price per Night (optional)</label>
                      <input className="form-control" type="number" min="0"
                        value={form.pricePerNight} onChange={e => setForm(f => ({ ...f, pricePerNight: e.target.value }))} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Slot Duration (minutes)</label>
                      <select className="form-control" value={form.slotDuration} onChange={e => setForm(f => ({ ...f, slotDuration: e.target.value }))}>
                        {[15, 20, 30, 45, 60, 90, 120].map(v => <option key={v} value={v}>{v} min</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Capacity per Slot</label>
                      <select className="form-control" value={form.slotCapacity} onChange={e => setForm(f => ({ ...f, slotCapacity: e.target.value }))}>
                        {[1, 2, 3, 4, 5, 6, 8, 10].map(v => <option key={v} value={v}>{v} {v === 1 ? 'booking' : 'bookings'} at a time</option>)}
                      </select>
                    </div>
                  </>
                )}
                {/* QunjeeEats fulfillment switches — same flags the owner's
                    Business Profile edits. offersBooking gates "Book a Table" +
                    the dine-in bridge at checkout; offersPickup gates the Self
                    Pickup button (missing on old docs = ON). */}
                {business.type === 'restaurant' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!form.offersBooking}
                          onChange={e => setForm(f => ({ ...f, offersBooking: e.target.checked }))} />
                        Table Booking / Dine-in pre-orders
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
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
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Working Hours</h3>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.showWorkingHours !== false}
                  className={`toggle-switch ${form.showWorkingHours !== false ? 'on' : ''}`}
                  onClick={() => setForm(f => ({ ...f, showWorkingHours: !f.showWorkingHours }))}
                  title={form.showWorkingHours !== false ? 'Shown on public page' : 'Hidden from public page'}
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
                    ) : <span className="closed-label">Closed</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '1.5rem' }} title="Save Details">
            <Save size={16} />
          </button>
        </form>
      )}

      {tab === 'services' && (
        <div>
          <div className="services-header">
            <h2 style={{ fontSize: '1.1rem' }}>Services</h2>
            <button className="btn btn-primary btn-sm" onClick={openNewSvc} title="Add Service"><Plus size={16} /></button>
          </div>

          {showSvcForm && (
            <div className="service-form card fade-up">
              <div className="card-header">
                <h3>{svcEditId ? 'Edit Service' : 'New Service'}</h3>
                <button className="btn btn-ghost btn-sm" onClick={closeSvcForm}><X size={16} /></button>
              </div>
              <form onSubmit={handleSaveService} className="card-body">
                <div className="form-group">
                  <label className="form-label">Photo</label>
                  <div className="logo-upload-row">
                    {svcForm.image
                      ? <img src={svcForm.image} alt="Service" className="service-thumb service-thumb-lg" />
                      : <div className="service-thumb service-thumb-lg service-thumb-placeholder"><User size={22} /></div>
                    }
                    <label className="btn btn-ghost btn-sm">
                      <ImagePlus size={15} /> {svcForm.image ? 'Change Photo' : 'Upload Photo'}
                      <input type="file" accept="image/*" hidden onChange={handleSvcImageFileChange} />
                    </label>
                    {svcForm.image && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveSvcImage}>
                        <X size={15} /> Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">{business.type === 'hotel' ? 'Room Type Name *' : 'Service Name *'}</label>
                    <input className="form-control" value={svcForm.name} onChange={e => setSvcForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  {business.type === 'hotel' ? (
                    <div className="form-group">
                      <label className="form-label">Total Rooms *</label>
                      <input className="form-control" type="number" min={1}
                        value={svcForm.totalRooms} onChange={e => setSvcForm(f => ({ ...f, totalRooms: e.target.value }))} required />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Duration (minutes) *</label>
                      <div className="input-icon-wrap">
                        <Clock size={16} className="input-icon" />
                        <input className="form-control input-with-icon" type="number" min={5} max={480}
                          value={svcForm.duration} onChange={e => setSvcForm(f => ({ ...f, duration: e.target.value }))} required />
                      </div>
                    </div>
                  )}
                </div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">{business.type === 'hotel' ? 'Price per Night (PKR)' : 'Price (PKR)'}</label>
                    <div className="input-icon-wrap">
                      <DollarSign size={16} className="input-icon" />
                      <input className="form-control input-with-icon" type="number" min={0} placeholder="0"
                        value={svcForm.price} onChange={e => setSvcForm(f => ({ ...f, price: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input className="form-control" value={svcForm.description} onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={closeSvcForm}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={svcSaving} title="Save Service">
                    <Save size={16} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {servicesLoading ? (
            <div className="services-list">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} h="70px" r="var(--radius)" />)}</div>
          ) : services.length === 0 ? (
            <div className="empty-state"><p>No services yet.</p></div>
          ) : (
            <div className="services-list">
              {services.map(s => (
                <div key={s.id} className="service-item card">
                  <div className="card-body service-item-inner">
                    {s.image
                      ? <img src={s.image} alt={s.name} className="service-thumb" />
                      : <div className="service-thumb service-thumb-placeholder"><User size={16} /></div>
                    }
                    <div className="service-item-info">
                      <p className="service-item-name">
                        {s.name} {s.onTop && <span className="badge badge-ontop">OnTop</span>}
                      </p>
                      {s.description && <p className="service-item-desc">{s.description}</p>}
                      <div className="service-item-meta">
                        {business.type === 'hotel'
                          ? <span>{s.totalRooms || 1} room{(s.totalRooms || 1) > 1 ? 's' : ''}</span>
                          : <span><Clock size={12} /> {s.duration} min</span>
                        }
                        {s.price && <span>PKR {Number(s.price).toLocaleString()}{business.type === 'hotel' ? ' / night' : ''}</span>}
                      </div>
                    </div>
                    <div className="service-item-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggleOnTop(s)}
                        title={s.onTop ? 'Unpin from top' : 'Pin to top'}
                        style={s.onTop ? { color: '#92400E' } : undefined}
                      >
                        <Star size={14} fill={s.onTop ? 'currentColor' : 'none'} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditSvc(s)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteService(s.id, s.name)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'slots' && (
        <div>
          {slotsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{Array.from({ length: 4 }).map((_, i) => <Sk key={i} h="48px" r="10px" />)}</div>
          ) : (
            <DataTable
              emptyMessage="No slot locks — nothing is currently booked."
              columns={[
                { key: 'date', header: 'Date', sortable: true, render: s => s.date },
                { key: 'time', header: 'Time', sortable: true, render: s => s.time },
                { key: 'booked', header: 'Booked', sortable: true, render: s => s.booked },
                { key: 'capacity', header: 'Capacity', sortable: true, render: s => s.capacity },
                { key: 'actions', header: 'Actions', stopRowClick: true, render: s => (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSlot(s.id)} title="Delete"><Trash2 size={14} /></button>
                ) },
              ]}
              rows={slots}
            />
          )}
        </div>
      )}

      {tab === 'subscription' && (
        <div className="profile-grid">
          <div className="card">
            <div className="card-header"><h3>Subscription Status</h3></div>
            <div className="card-body">
              <p style={{ marginBottom: '0.75rem' }}>
                <span className={`badge badge-${subStatus.active ? 'confirmed' : 'cancelled'}`}>
                  {subStatus.kind === 'legacy' ? 'Active (legacy)'
                    : subStatus.kind === 'trial' ? 'Free trial'
                    : subStatus.kind === 'subscribed' ? 'Subscribed'
                    : 'Expired'}
                </span>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {subStatus.kind === 'legacy' && 'Registered before subscriptions existed — always active, no expiry.'}
                {subStatus.kind === 'trial' && <>Free trial ends <strong>{format(subStatus.until, 'd MMMM yyyy')}</strong>. New bookings/orders stop after that unless extended below.</>}
                {subStatus.kind === 'subscribed' && <>Active until <strong>{format(subStatus.until, 'd MMMM yyyy')}</strong>.</>}
                {subStatus.kind === 'expired' && <>Expired <strong>{subStatus.until ? format(subStatus.until, 'd MMMM yyyy') : ''}</strong> — new bookings and orders are blocked until you set a new date below. Existing bookings, profile, and history are unaffected.</>}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Monthly Subscription Fee</h3></div>
            <div className="card-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Global — applies to every business's invoice below, not just this one.
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <div className="input-icon-wrap" style={{ maxWidth: '180px' }}>
                  <DollarSign size={16} className="input-icon" />
                  <input className="form-control input-with-icon" type="number" min={1}
                    value={feeDraft} onChange={e => setFeeDraft(e.target.value)} />
                </div>
                <button type="button" className="btn btn-secondary" disabled={feeSaving || Number(feeDraft) === subscriptionFee}
                  onClick={handleSaveFee}>
                  {feeSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.6rem' }}>
                Currently PKR {subscriptionFee.toLocaleString()}/month.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Set Active Until</h3></div>
            <div className="card-body">
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Pick the date this business stays active through, once their off-app (WhatsApp) payment is confirmed.
              </p>
              <MonthCalendarPicker value={activeUntilDraft} onChange={setActiveUntilDraft} minDate={new Date()} />
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
                disabled={!activeUntilDraft || subSaving}
                onClick={handleSaveSubscription}
              >
                <Save size={16} /> {subSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'danger' && (
        <div className="card sa-danger-card">
          <div className="card-header"><h3>Danger Zone</h3></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="sa-danger-row">
              <div>
                <p style={{ fontWeight: 500 }}>{business.isActive ? 'Deactivate business' : 'Reactivate business'}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {business.isActive ? 'Hides it from public listings. Data is kept — reversible any time.' : 'Makes it publicly visible and bookable again.'}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={toggleActive}>
                {business.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            </div>

            <div className="sa-danger-row sa-danger-row--hard">
              <div>
                <p style={{ fontWeight: 500, color: '#DC2626' }}>Permanently delete</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Deletes the business, all its services, all slot locks / room-night locks, and every appointment or reservation made against it. This cannot be undone.
                  Type <strong>{business.name}</strong> to confirm.
                </p>
                <input
                  className="form-control"
                  style={{ marginTop: '0.6rem', maxWidth: '320px' }}
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  placeholder={business.name}
                />
              </div>
              <button className="btn btn-danger" disabled={confirmName !== business.name || deleting} onClick={handleHardDelete}>
                <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cropSrc && (
        <LogoCropModal
          imageSrc={cropSrc}
          onCancel={() => setCropSrc(null)}
          onSave={handleLogoSave}
        />
      )}

      {svcCropSrc && (
        <LogoCropModal
          imageSrc={svcCropSrc}
          title="Crop Photo"
          saveLabel="Save Photo"
          onCancel={() => setSvcCropSrc(null)}
          onSave={handleSvcImageCropSave}
        />
      )}
    </div>
  );
}
