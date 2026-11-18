import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Clock, DollarSign, ImagePlus, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useServices } from '../../hooks/useServices';
import LogoCropModal from '../../components/shared/LogoCropModal';
import Sk from '../../components/shared/Skeleton';
import './ServicesPage.css';

const EMPTY_FORM = { name: '', description: '', duration: 30, price: '', image: null, totalRooms: 1 };

// Best-effort — a service is never blocked on Storage cleanup succeeding.
async function tryDeleteImage(url) {
  if (!url) return;
  try { await deleteObject(ref(storage, url)); } catch { /* orphaned file is harmless */ }
}

const SERVICE_HINTS = {
  restaurant: { name: 'e.g. Table for 2, Private Dining, Takeaway', desc: 'e.g. Window seat, outdoor area' },
  salon:      { name: 'e.g. Haircut, Hair Color, Manicure',          desc: 'e.g. Includes wash & blow-dry' },
  clinic:     { name: 'e.g. General Consultation, Follow-up, ECG',   desc: 'e.g. Includes basic checkup' },
  hotel:      { name: 'e.g. Executive Room, Deluxe Suite',           desc: 'e.g. Mountain view, 2 queen beds' },
  nayasaa:    { name: 'e.g. Bridal Lehenga – Red, Groom Sherwani – Gold', desc: 'e.g. Size M, dupatta included' },
  default:    { name: 'e.g. Service name',                            desc: 'Brief description' },
};

// Business types that rent out a pool of named items by date range (rooms,
// outfits) instead of appointment slots — share the same Photo/Price/Total
// Units form shape, just different labels. Kept in sync with the identical
// list in AdminRegister.jsx.
const POOL_BOOKING_TYPES = ['hotel', 'nayasaa', 'beachhuts'];
const POOL_TYPE_LABELS = {
  hotel:     { heading: 'Room Types', addLabel: 'Add Room Type', editLabel: 'Edit Room Type', newLabel: 'New Room Type', saveLabel: 'Save Room Type', nameLabel: 'Room Type Name *', unitLabel: 'Total Rooms *', unitSuffix: 'room', priceLabel: 'Price per Night (PKR)', priceUnit: ' / night', emptyLabel: 'No room types yet. Add your first one!' },
  nayasaa:   { heading: 'Outfits',    addLabel: 'Add Outfit',    editLabel: 'Edit Outfit',    newLabel: 'New Outfit',    saveLabel: 'Save Outfit',    nameLabel: 'Outfit Name *',    unitLabel: 'Total Units *', unitSuffix: 'unit', priceLabel: 'Price per Day (PKR)',   priceUnit: ' / day',   emptyLabel: 'No outfits yet. Add your first one!' },
  // beachhuts: { heading: 'Huts',       addLabel: 'Add Hut',       editLabel: 'Edit Hut',       newLabel: 'New Hut',       saveLabel: 'Save Hut',       nameLabel: 'Hut Name *',       unitLabel: 'Total Huts *',  unitSuffix: 'hut',  priceLabel: 'Price per Night (PKR)', priceUnit: ' / night', emptyLabel: 'No huts yet. Add your first one!' },
  // Beach Huts priced per day, not per night (2026-09-24)
  beachhuts: { heading: 'Huts',       addLabel: 'Add Hut',       editLabel: 'Edit Hut',       newLabel: 'New Hut',       saveLabel: 'Save Hut',       nameLabel: 'Hut Name *',       unitLabel: 'Total Huts *',  unitSuffix: 'hut',  priceLabel: 'Price per Day (PKR)', priceUnit: ' / day', emptyLabel: 'No huts yet. Add your first one!' },
};

export default function ServicesPage() {
  const { userProfile } = useAuth();
  const { fetchByAdmin, fetchOne } = useBusinesses();
  const [businessId, setBusinessId]   = useState(null);
  const [businessType, setBusinessType] = useState('default');

  useEffect(() => {
    const load = async () => {
      const biz = userProfile?.businessId ? await fetchOne(userProfile.businessId) : await fetchByAdmin(userProfile.uid);
      if (biz) { setBusinessId(biz.id); setBusinessType(biz.type || 'default'); }
    };
    if (userProfile) load();
  }, [userProfile]);

  const { services, loading, fetchAll, create, update, remove } = useServices(businessId);

  useEffect(() => { if (businessId) fetchAll(); }, [businessId]);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [cropSrc, setCropSrc]   = useState(null);

  const openNew  = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (s) => { setForm({ name: s.name, description: s.description || '', duration: s.duration, price: s.price || '', image: s.image || null, totalRooms: s.totalRooms ?? 1 }); setEditId(s.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  // Uploads right away (so there's a URL to preview/hold); the service itself
  // is only written to Firestore when the form's Save is clicked.
  const handleImageCropSave = async (blob) => {
    const fileRef = ref(storage, `service-images/${userProfile.uid}/${Date.now()}.jpg`);
    await uploadBytes(fileRef, blob);
    const url = await getDownloadURL(fileRef);
    await tryDeleteImage(form.image);   // replacing — drop the old file
    setForm(f => ({ ...f, image: url }));
    setCropSrc(null);
  };

  const handleRemoveImage = async () => {
    await tryDeleteImage(form.image);
    setForm(f => ({ ...f, image: null }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = POOL_BOOKING_TYPES.includes(businessType)
        ? { name: form.name, description: form.description, image: form.image, price: form.price ? Number(form.price) : null, totalRooms: Number(form.totalRooms) || 1 }
        : { ...form, duration: Number(form.duration), price: form.price ? Number(form.price) : null };
      if (editId) await update(editId, data);
      else await create(data);
      toast.success(editId ? 'Service updated.' : 'Service added.');
      closeForm();
    } catch {
      toast.error('Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    const svc = services.find(s => s.id === id);
    await remove(id);
    await tryDeleteImage(svc?.image);
    toast.success('Service deleted.');
  };

  return (
    <div className="admin-layout page">
      <div className="container">
        <div className="services-header">
          <h1>{POOL_TYPE_LABELS[businessType]?.heading || 'Services'}</h1>
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> {POOL_TYPE_LABELS[businessType]?.addLabel || 'Add Service'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="service-form card fade-up">
            <div className="card-header">
              <h3>{editId
                ? (POOL_TYPE_LABELS[businessType]?.editLabel || 'Edit Service')
                : (POOL_TYPE_LABELS[businessType]?.newLabel || 'New Service')}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeForm}><X size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="card-body">
              <div className="form-group">
                <label className="form-label">Photo</label>
                <div className="logo-upload-row">
                  {form.image
                    ? <img src={form.image} alt="Service" className="service-thumb service-thumb-lg" />
                    : <div className="service-thumb service-thumb-lg service-thumb-placeholder"><User size={22} /></div>
                  }
                  <label className="btn btn-ghost btn-sm">
                    <ImagePlus size={15} /> {form.image ? 'Change Photo' : 'Upload Photo'}
                    <input type="file" accept="image/*" hidden onChange={handleImageFileChange} />
                  </label>
                  {form.image && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemoveImage}>
                      <X size={15} /> Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">{POOL_TYPE_LABELS[businessType]?.nameLabel || 'Service Name *'}</label>
                  <input className="form-control" placeholder={(SERVICE_HINTS[businessType] || SERVICE_HINTS.default).name}
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                {POOL_BOOKING_TYPES.includes(businessType) ? (
                  <div className="form-group">
                    <label className="form-label">{POOL_TYPE_LABELS[businessType].unitLabel}</label>
                    <input className="form-control" type="number" min={1}
                      value={form.totalRooms} onChange={e => setForm(f => ({ ...f, totalRooms: e.target.value }))} required />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Duration (minutes) *</label>
                    <div className="input-icon-wrap">
                      <Clock size={16} className="input-icon" />
                      <input className="form-control input-with-icon" type="number" min={5} max={480}
                        value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required />
                    </div>
                  </div>
                )}
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">{POOL_TYPE_LABELS[businessType]?.priceLabel || 'Price (PKR)'}</label>
                  <div className="input-icon-wrap">
                    <DollarSign size={16} className="input-icon" />
                    <input className="form-control input-with-icon" type="number" min={0} placeholder="0"
                      value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-control" maxLength={150} placeholder={(SERVICE_HINTS[businessType] || SERVICE_HINTS.default).desc}
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  <p className="form-hint" style={{ textAlign: 'right', margin: '0.25rem 0 0' }}>{form.description.length}/150</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving…' : (POOL_TYPE_LABELS[businessType]?.saveLabel || 'Save Service')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Services list */}
        {loading ? (
          <div className="services-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="service-item card">
                <div className="card-body service-item-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    <Sk w="45%" h="1rem" />
                    <Sk w="65%" h="0.8rem" />
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <Sk w="60px" h="0.75rem" />
                      <Sk w="70px" h="0.75rem" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Sk w="64px" h="32px" r="6px" />
                    <Sk w="36px" h="32px" r="6px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="empty-state">
            <p>{POOL_TYPE_LABELS[businessType]?.emptyLabel || 'No services yet. Add your first one!'}</p>
          </div>
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
                    <p className="service-item-name">{s.name}</p>
                    {s.description && <p className="service-item-desc">{s.description}</p>}
                    <div className="service-item-meta">
                      {POOL_BOOKING_TYPES.includes(businessType)
                        ? <span>{s.totalRooms || 1} {POOL_TYPE_LABELS[businessType].unitSuffix}{(s.totalRooms || 1) > 1 ? 's' : ''}</span>
                        : <span><Clock size={12} /> {s.duration} min</span>
                      }
                      {s.price && <span>PKR {Number(s.price).toLocaleString()}{POOL_TYPE_LABELS[businessType]?.priceUnit || ''}</span>}
                    </div>
                  </div>
                  <div className="service-item-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cropSrc && (
        <LogoCropModal
          imageSrc={cropSrc}
          title="Crop Photo"
          saveLabel="Save Photo"
          onCancel={() => setCropSrc(null)}
          onSave={handleImageCropSave}
        />
      )}
    </div>
  );
}
