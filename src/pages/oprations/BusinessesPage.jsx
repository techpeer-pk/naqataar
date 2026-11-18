import { useState, useEffect, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Search, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useAuditLog } from '../../hooks/useAuditLog';
import { filterBySearch } from '../../utils/search';
import { subscriptionStatus } from '../../utils/subscription';
import { formatCurrency } from '../../utils/chartPalette';
import OpsDataTable, { escapeHtml } from '../../components/oprations/OpsDataTable';
import Modal from '../../components/superadmin/Modal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';
import '../admin/Dashboard.css';

const TYPE_LABELS = {
  restaurant: 'Restaurant', salon: 'Salon', clinic: 'Clinic', hotel: 'Hotel', padel: 'Padel Club',
  sehatkamla: 'HealthCare', nayasaa: 'Nayasaa', rasoomat: 'Rasoomat', catering: 'Catering', studyabroad: 'Study Abroad',
};

function toMillis(ts) {
  return ts?.toMillis ? ts.toMillis() : ts?.seconds ? ts.seconds * 1000 : null;
}
function toDateInput(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toISOString().slice(0, 10) : '';
}
function toDateStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleDateString() : '—';
}

// The B2B side of Operations monitoring — read for every tier, edit
// (isActive / activeUntil / basic contact fields, unrestricted-field update
// per firestore.rules) for managerBD/managerOps (or SuperAdmin) only. No
// create-business form here — that stays SuperAdmin-only in /superadmin;
// this console monitors and adjusts existing businesses, it doesn't onboard
// new ones. See docs/Operations-Console.md.
export default function OpsBusinessesPage() {
  const { isOpsManager, isSuperAdmin } = useAuth();
  const canEdit = isOpsManager || isSuperAdmin;

  // pageSize: 'all' — fetch the whole collection once; DataTables' own
  // length-menu/pagination (not a second "Load more" fetch step) is what
  // actually pages through it from here.
  const { rows, loading, reload } = usePaginatedCollection('businesses', { mode: 'page', pageSize: 'all' });
  const { update } = useBusinesses();
  const { log } = useAuditLog();

  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ isActive: true, activeUntil: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { reload(); }, [reload]);

  const displayed = useMemo(() => filterBySearch(rows, search, ['name', 'address', 'id']), [rows, search]);

  const openRow = (b) => {
    if (!canEdit) return;
    setEditing(b);
    setForm({ isActive: !!b.isActive, activeUntil: toDateInput(b.activeUntil), phone: b.phone || '', address: b.address || '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await update(editing.id, {
        isActive: form.isActive,
        activeUntil: form.activeUntil ? Timestamp.fromDate(new Date(form.activeUntil)) : null,
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      await log({ action: 'update', targetCollection: 'businesses', docId: editing.id, summary: `${editing.name}: isActive→${form.isActive}, activeUntil→${form.activeUntil || '—'}` });
      toast.success('Business updated.');
      setEditing(null);
      reload();
    } catch {
      toast.error('Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(() => [
    { title: 'Name', value: b => b.name, html: b => `${escapeHtml(b.name)}<span class="dt-sub">${escapeHtml(b.address || '—')}</span>` },
    { title: 'Type', value: b => TYPE_LABELS[b.type] || b.type },
    { title: 'Status', value: b => b.isActive ? 'Active' : 'Inactive',
      html: b => `<span class="badge badge-${b.isActive ? 'confirmed' : 'cancelled'}">${b.isActive ? 'Active' : 'Inactive'}</span>` },
    { title: 'Subscription', value: b => {
      const s = subscriptionStatus(b);
      return s.kind === 'legacy' ? 'Legacy' : s.active ? 'Active' : 'Expired';
    }, html: b => {
      const s = subscriptionStatus(b);
      const label = s.kind === 'legacy' ? 'Legacy' : s.kind === 'trial' ? 'Trial' : s.kind === 'subscribed' ? 'Subscribed' : 'Expired';
      return `<span class="badge badge-${s.active ? 'confirmed' : 'cancelled'}">${escapeHtml(label)}</span>`;
    } },
    { title: 'Owner UID', value: b => b.adminUid || '—' },
    { title: 'Phone', value: b => b.phone || '—' },
    { title: 'Email', value: b => b.email || '—', visible: false },
    // Financial — the only per-business price field (hotel/Nayasaa room-pool
    // pricing); the rest of a business's revenue lives on its individual
    // transactions (see Appointments/Reservations/Orders' price columns).
    { title: 'Price / Night', value: b => b.pricePerNight != null ? formatCurrency(b.pricePerNight) : '—' },
    { title: 'Offers Booking', value: b => b.offersBooking ? 'Yes' : 'No', visible: false },
    { title: 'Offers Ordering', value: b => b.offersOrdering ? 'Yes' : 'No', visible: false },
    { title: 'Registered', value: b => toMillis(b.createdAt) || 0, html: b => toDateStr(b.createdAt), visible: false },
  ], []);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Businesses</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {rows.length} businesses.{canEdit ? ' Click a row to edit.' : ' Read-only for your tier.'}
          </p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search name or address…"
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
          <OpsDataTable columns={columns} rows={displayed} emptyMessage="No businesses found." onRowClick={openRow} exportFilename="businesses" />
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name || 'Business'}>
        {editing && (
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                Active (visible to customers)
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">Subscription active until</label>
              <input type="date" className="form-control" value={form.activeUntil}
                onChange={e => setForm(f => ({ ...f, activeUntil: e.target.value }))} />
              <p className="form-hint">Leave blank for no expiry (legacy/always-active).</p>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-control" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
