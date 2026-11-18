import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Save, Power, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useAuth } from '../../context/AuthContext';
import { filterBySearch } from '../../utils/search';
import DataTable from '../../components/superadmin/DataTable';
import Modal from '../../components/superadmin/Modal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const EMPTY_FORM = { name: '', description: '', address: '', phone: '', offersBooking: false };

export default function FoodVendsPage() {
  const { rows, setRows, loading, hasMore, loadMore, reload } = usePaginatedCollection('businesses');
  const { create, update } = useBusinesses();
  const { log } = useAuditLog();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // FoodVend being edited, or null = new
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => { reload(); }, [reload]);

  // Ops only sees Eats vendors — never salons/clinics/booking restaurants.
  const foodvends = useMemo(
    () => rows.filter(b => b.type === 'restaurant' && b.offersOrdering === true),
    [rows]
  );
  const displayed = useMemo(
    () => filterBySearch(foodvends, search, ['name', 'address', 'phone']),
    [foodvends, search]
  );

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({
      name:          b.name || '',
      phone:         b.phone || '',
      address:       b.address || '',
      description:   b.description || '',
      offersBooking: b.offersBooking === true,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      name:        form.name.trim(),
      description: form.description.trim(),
      address:     form.address.trim(),
      phone:       form.phone.trim(),
      // Hybrid (F1): also listed in the booking browse so customers can
      // reserve a table — needs services/working hours set up to be bookable.
      offersBooking: !!form.offersBooking,
    };
    try {
      if (editing) {
        await update(editing.id, data);
        await log({ action: 'update', targetCollection: 'businesses', docId: editing.id, summary: `Restaurant updated: ${data.name}` });
        setRows(prev => prev.map(r => r.id === editing.id ? { ...r, ...data } : r));
        toast.success('Restaurant updated.');
      } else {
        const businessId = await create({
          ...data,
          type:           'restaurant',
          offersOrdering: true,
          // Vendors have no accounts — the onboarding Ops staffer's uid goes
          // here purely to satisfy the create rule; authorization for the whole
          // Ops team comes from the eatsAdmins allowlist, not this field.
          adminUid:       user.uid,
        });
        await log({ action: 'create', targetCollection: 'businesses', docId: businessId, summary: `Restaurant onboarded: ${data.name}` });
        toast.success('Restaurant added.');
        reload();
      }
      closeForm();
    } catch {
      toast.error('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (b) => {
    setTogglingId(b.id);
    try {
      await update(b.id, { isActive: !b.isActive });
      await log({ action: 'update', targetCollection: 'businesses', docId: b.id, summary: `${b.name}: ${b.isActive ? 'deactivated' : 'activated'}` });
      setRows(prev => prev.map(r => r.id === b.id ? { ...r, isActive: !b.isActive } : r));
      toast.success(b.isActive ? 'Restaurant deactivated.' : 'Restaurant activated.');
    } catch {
      toast.error('Update failed.');
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    { key: 'name', header: 'Restaurant', sortable: true, sortValue: b => (b.name || '').toLowerCase(), render: b => (
      <>
        <p className="customer-name">{b.name}</p>
        <p className="customer-contact">{b.address || '—'}</p>
      </>
    ) },
    { key: 'phone', header: 'Phone', sortable: true, render: b => b.phone || '—' },
    { key: 'isActive', header: 'Status', sortable: true, sortValue: b => (b.isActive ? 1 : 0), render: b => (
      <span className={`badge badge-${b.isActive ? 'confirmed' : 'cancelled'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
    ) },
    { key: 'actions', header: 'Actions', stopRowClick: true, render: b => (
      <div className="action-btns">
        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)} title="Edit">
          <Pencil size={14} />
        </button>
        <button className="btn btn-ghost btn-sm" disabled={togglingId === b.id}
          onClick={() => toggleActive(b)} title={b.isActive ? 'Deactivate' : 'Activate'}>
          <Power size={14} />
        </button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Restaurants</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {displayed.length} restaurant{displayed.length === 1 ? '' : 's'} — click a row to manage its menu.
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew} title="Add Restaurant"><Plus size={16} /></button>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search name, address, phone…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable
            columns={columns}
            rows={displayed}
            emptyMessage="No restaurants yet — add the first one."
            onRowClick={b => navigate(`/eatsadmin/foodvends/${b.id}/menu`)}
          />
        </div>
      )}

      {hasMore && (
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }} disabled={loading} onClick={loadMore}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      <Modal open={showForm} onClose={closeForm} title={editing ? 'Edit Restaurant' : 'Add Restaurant'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Restaurant Name *</label>
            <input className="form-control" value={form.name} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone *</label>
            <input className="form-control" type="tel" required placeholder="Orders will be relayed to this number"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-control" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-control" placeholder="e.g. Biryani, karahi, BBQ"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.offersBooking}
                onChange={e => setForm(f => ({ ...f, offersBooking: e.target.checked }))} />
              Also takes table bookings (hybrid — customers can reserve &amp; pre-order)
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} title={editing ? 'Save Changes' : 'Add Restaurant'}>
              <Save size={16} />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
