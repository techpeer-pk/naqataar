import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Plus, Save, Pencil, Trash2, Eye, EyeOff, ImagePlus, X, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useMenuItems } from '../../hooks/useMenuItems';
import { useAuditLog } from '../../hooks/useAuditLog';
import Modal from '../../components/superadmin/Modal';
import LogoCropModal from '../../components/shared/LogoCropModal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const EMPTY_FORM = { name: '', category: '', price: '', description: '', image: null };

// Best-effort — a menu item is never blocked on Storage cleanup succeeding.
async function tryDeleteImage(url) {
  if (!url) return;
  try { await deleteObject(ref(storage, url)); } catch { /* orphaned file is harmless */ }
}

// Used two ways: by Ops at /eatsadmin/foodvends/:id/menu (id from the URL),
// and by an owner-managed vendor at /admin/menu (F2 — own businessId passed
// as a prop, no back-link to the Ops console).
export default function FoodVendMenuPage({ businessId }) {
  const { id: paramId } = useParams();
  const id = businessId || paramId;
  const ownerMode = !!businessId;
  const { userProfile } = useAuth();
  const { fetchOne } = useBusinesses();
  const { menuItems, loading, fetchAll, create, update, remove } = useMenuItems(id);
  const { log } = useAuditLog();

  const [business, setBusiness] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);   // item being edited, or null = new
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [busyId, setBusyId]     = useState(null);
  const [cropSrc, setCropSrc]   = useState(null);

  useEffect(() => {
    fetchOne(id).then(setBusiness);
    fetchAll();
  }, [id]);

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name:        item.name || '',
      category:    item.category || '',
      price:       item.price != null ? String(item.price) : '',
      description: item.description || '',
      image:       item.image || null,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  // Uploads right away (so there's a URL to preview/hold), but the item
  // itself is only written to Firestore when the form's Save is clicked —
  // matches every other field in this form instead of the logo's own-save pattern.
  const handleImageCropSave = async (blob) => {
    const fileRef = ref(storage, `menu-item-images/${userProfile.uid}/${Date.now()}.jpg`);
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
    const data = {
      name:        form.name.trim(),
      category:    form.category.trim(),
      price:       form.price === '' ? null : Number(form.price),
      description: form.description.trim(),
      image:       form.image || null,
    };
    try {
      if (editing) {
        await update(editing.id, data);
        await log({ action: 'update', targetCollection: 'menuItems', docId: editing.id, summary: `${business?.name}: ${data.name} updated` });
        toast.success('Item updated.');
      } else {
        const itemId = await create(data);
        await log({ action: 'create', targetCollection: 'menuItems', docId: itemId, summary: `${business?.name}: ${data.name} added` });
        toast.success('Item added.');
      }
      closeForm();
    } catch {
      toast.error('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (item) => {
    setBusyId(item.id);
    try {
      await update(item.id, { isAvailable: item.isAvailable === false });
      await log({ action: 'update', targetCollection: 'menuItems', docId: item.id, summary: `${business?.name}: ${item.name} ${item.isAvailable === false ? 'available' : 'unavailable'}` });
    } catch {
      toast.error('Update failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setBusyId(item.id);
    try {
      await remove(item.id);
      await tryDeleteImage(item.image);
      await log({ action: 'delete', targetCollection: 'menuItems', docId: item.id, summary: `${business?.name}: ${item.name} removed` });
      toast.success('Item deleted.');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      {!ownerMode && (
        <Link to="/eatsadmin" className="back-link"><ChevronLeft size={16} /> Restaurants</Link>
      )}

      <div className="dashboard-header">
        <div>
          <h1>{business ? `${business.name} — Menu` : 'Menu'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {menuItems.length} item{menuItems.length === 1 ? '' : 's'}
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew} title="Add Item"><Plus size={16} /></button>
      </div>

      {loading && menuItems.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : menuItems.length === 0 ? (
        <div className="empty-state">
          <p>Menu is empty — add the first item.</p>
        </div>
      ) : (
        <div className="appt-table card" style={{ marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {item.image
                        ? <img src={item.image} alt={item.name} className="menu-item-thumb" />
                        : <div className="menu-item-thumb menu-item-thumb-placeholder"><UtensilsCrossed size={16} /></div>
                      }
                      <div>
                        <p className="customer-name">{item.name}</p>
                        {item.description && <p className="customer-contact">{item.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td>{item.category || '—'}</td>
                  <td>{item.price != null ? `PKR ${Number(item.price).toLocaleString()}` : '—'}</td>
                  <td>
                    <span className={`badge badge-${item.isAvailable === false ? 'cancelled' : 'confirmed'}`}>
                      {item.isAvailable === false ? 'Unavailable' : 'Available'}
                    </span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-ghost btn-sm" disabled={busyId === item.id}
                        onClick={() => toggleAvailable(item)}
                        title={item.isAvailable === false ? 'Mark available' : 'Mark unavailable'}>
                        {item.isAvailable === false ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={busyId === item.id}
                        onClick={() => handleDelete(item)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit Item' : 'Add Item'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Photo</label>
            <div className="logo-upload-row">
              {form.image
                ? <img src={form.image} alt="Item" className="menu-item-thumb menu-item-thumb-lg" />
                : <div className="menu-item-thumb menu-item-thumb-lg menu-item-thumb-placeholder"><UtensilsCrossed size={20} /></div>
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
          <div className="form-group">
            <label className="form-label">Item Name *</label>
            <input className="form-control" value={form.name} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="form-control" placeholder="e.g. Biryani, BBQ, Drinks"
                value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Price (PKR) *</label>
              <input className="form-control" type="number" min="0" required
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-control" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} title="Save Item">
              <Save size={16} />
            </button>
          </div>
        </form>
      </Modal>

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
