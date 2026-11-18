import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Copy, Plus, Save, Building2, Radio, Utensils, Scissors, Stethoscope, Hotel, LandPlot, HeartPulse, Clock, AlertTriangle, Ban, ParkingCircle, Palmtree } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { db } from '../../firebase';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useLiveUserCount } from '../../hooks/usePresence';
import { useUsers } from '../../hooks/useUsers';
import { useAuditLog } from '../../hooks/useAuditLog';
import { filterBySearch } from '../../utils/search';
import { subscriptionStatus } from '../../utils/subscription';
import DataTable from '../../components/superadmin/DataTable';
import PresenceDot from '../../components/superadmin/PresenceDot';
import Modal from '../../components/superadmin/Modal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';
import '../admin/Dashboard.css';

function toMillis(ts) {
  if (!ts) return null;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : null;
}
function toDateStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleDateString() : '—';
}

const TYPES = ['restaurant', 'salon', 'clinic', 'hotel', 'padel', 'sehatkamla', 'carvalet', 'beachhuts'];
const TYPE_LABELS = { restaurant: 'Restaurant', salon: 'Salon', clinic: 'Clinic', hotel: 'Hotel', padel: 'Padel Club', sehatkamla: 'HealthCare', carvalet: 'Car Valet', beachhuts: 'Beach Huts' };
const TYPE_ICONS = { restaurant: Utensils, salon: Scissors, clinic: Stethoscope, hotel: Hotel, padel: LandPlot, sehatkamla: HeartPulse, carvalet: ParkingCircle, beachhuts: Palmtree };
const STAT_COLORS = ['primary', 'blue', 'green', 'amber'];
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 'all'];
const DEFAULT_HOURS = {
  mon: { open: '09:00', close: '21:00' }, tue: { open: '09:00', close: '21:00' }, wed: { open: '09:00', close: '21:00' },
  thu: { open: '09:00', close: '21:00' }, fri: { open: '09:00', close: '21:00' }, sat: { open: '09:00', close: '21:00' }, sun: { open: '09:00', close: '21:00' },
};
const EMPTY_FORM = { name: '', type: 'restaurant', adminUid: '', address: '', phone: '' };

export default function BusinessesPage() {
  const { rows, loading, hasMore, hasPrev, page, pageSize, setPageSize, nextPage, prevPage, reload } = usePaginatedCollection('businesses', { mode: 'page', pageSize: 10 });
  const { create } = useBusinesses();
  const { update: updateUser } = useUsers();
  const { log } = useAuditLog();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { reload(); }, [reload]);

  // Independent of the paginated table above — `rows` there is only the
  // current page, but these stat cards need true counts across every
  // business, so this fetches the whole collection once (same pattern as
  // SuperAdmin OverviewPage.jsx).
  const [statCounts, setStatCounts] = useState(null);
  const liveUserCount = useLiveUserCount(statCounts?.adminUids);
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'businesses'));
      const docs = snap.docs.map(d => d.data());
      const byType = {};
      TYPES.forEach(t => { byType[t] = 0; });
      docs.forEach(b => { if (byType[b.type] != null) byType[b.type]++; });
      // Subscription health, independent of the isActive toggle above — see
      // src/utils/subscription.js. expiringSoon overlaps trial/subscribed on
      // purpose (a cross-cutting "act soon" alert, not its own bucket).
      const soon = new Date(Date.now() + 7 * 86400000);
      let trial = 0, expired = 0, expiringSoon = 0;
      docs.forEach(b => {
        const s = subscriptionStatus(b);
        if (s.kind === 'trial') trial++;
        else if (s.kind === 'expired') expired++;
        if (s.active && s.until && s.until <= soon) expiringSoon++;
      });
      setStatCounts({
        total: docs.length,
        active: docs.filter(b => b.isActive).length,
        adminUids: [...new Set(docs.map(b => b.adminUid).filter(Boolean))],
        byType,
        trial, expired, expiringSoon,
      });
    })();
  }, []);

  // Owner UID → name/email lookup, cross-linked to the Users page so
  // SuperAdmin doesn't have to manually copy a UID over and search for it.
  // Only resolves UIDs actually visible in the loaded page of businesses,
  // not the whole users collection.
  const [ownerLabels, setOwnerLabels] = useState({});
  useEffect(() => {
    const uids = [...new Set(rows.map(b => b.adminUid).filter(uid => uid && !ownerLabels[uid]))];
    if (uids.length === 0) return;
    (async () => {
      const entries = await Promise.all(uids.map(async uid => {
        const snap = await getDoc(doc(db, 'users', uid));
        return [uid, snap.exists() ? (snap.data().displayName || snap.data().email || null) : null];
      }));
      setOwnerLabels(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
  }, [rows]);

  const displayed = useMemo(() => {
    let list = filterBySearch(rows, search, ['name', 'address', 'id']);
    if (typeFilter !== 'all') list = list.filter(b => b.type === typeFilter);
    if (activeFilter !== 'all') list = list.filter(b => !!b.isActive === (activeFilter === 'active'));
    if (subFilter !== 'all') list = list.filter(b => subscriptionStatus(b).kind === subFilter);
    return list;
  }, [rows, search, typeFilter, activeFilter, subFilter]);

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success('Business ID copied.');
  };

  const closeCreate = () => { setShowCreate(false); setForm(EMPTY_FORM); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const businessId = await create({
        name: form.name.trim(),
        type: form.type,
        adminUid: form.adminUid.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        workingHours: DEFAULT_HOURS,
        slotDuration: 30,
        slotCapacity: 1,
      });
      if (form.adminUid.trim()) {
        try { await updateUser(form.adminUid.trim(), { businessId }); } catch { /* admin doc may not exist yet */ }
      }
      await log({ action: 'create', targetCollection: 'businesses', docId: businessId, summary: `${form.name} (${form.type}), owner ${form.adminUid || '—'}` });
      toast.success('Business created.');
      closeCreate();
      reload();
    } catch {
      toast.error('Create failed.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true, sortValue: b => (b.name || '').toLowerCase(), render: b => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        {b.logo
          ? <img src={b.logo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
          : <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-pale)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>{b.name?.[0]?.toUpperCase()}</div>
        }
        <div>
          <p className="customer-name">{b.name}</p>
          <p className="customer-contact">{b.address || '—'}</p>
        </div>
      </div>
    ) },
    { key: 'id', header: 'Business ID', sortable: true, stopRowClick: true, render: b => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span className="booking-ref-cell" style={{ color: 'var(--text-muted)' }}>{b.id}</span>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} onClick={() => copyId(b.id)} title="Copy Business ID">
          <Copy size={13} />
        </button>
      </div>
    ) },
    { key: 'type', header: 'Type', sortable: true, render: b => <span className={`badge badge-${b.type}`}>{b.type}</span> },
    { key: 'isActive', header: 'Status', sortable: true, sortValue: b => (b.isActive ? 1 : 0), exportValue: b => b.isActive ? 'Active' : 'Inactive', render: b => (
      <span className={`badge badge-${b.isActive ? 'confirmed' : 'cancelled'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
    ) },
    { key: 'subscription', header: 'Subscription', sortable: true,
      sortValue: b => { const s = subscriptionStatus(b); return s.active ? (s.until ? s.until.getTime() : Infinity) : -1; },
      exportValue: b => {
        const s = subscriptionStatus(b);
        return s.kind === 'legacy' ? 'Legacy' : s.kind === 'trial' ? `Trial until ${format(s.until, 'd MMM yyyy')}`
          : s.kind === 'subscribed' ? `Subscribed until ${format(s.until, 'd MMM yyyy')}` : 'Expired';
      },
      render: b => {
        const s = subscriptionStatus(b);
        return (
          <span className={`badge badge-${s.active ? 'confirmed' : 'cancelled'}`}>
            {s.kind === 'legacy' ? 'Legacy'
              : s.kind === 'trial' ? `Trial · ${format(s.until, 'd MMM yyyy')}`
              : s.kind === 'subscribed' ? `Paid · ${format(s.until, 'd MMM yyyy')}`
              : 'Expired'}
          </span>
        );
      } },
    { key: 'adminUid', header: 'Owner', sortable: true, stopRowClick: true, exportValue: b => ownerLabels[b.adminUid] || b.adminUid || '', render: b => b.adminUid ? (
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Link to={`/superadmin/users?q=${b.adminUid}`} style={{ fontSize: '0.78rem' }}>
          {ownerLabels[b.adminUid] || b.adminUid}
        </Link>
        <PresenceDot uid={b.adminUid} />
      </span>
    ) : <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>—</span> },
    { key: 'phone', header: 'Phone', sortable: true, render: b => b.phone || '—' },
    { key: 'createdAt', header: 'Registration Date', sortable: true, sortValue: b => toMillis(b.createdAt) || 0, exportValue: b => toDateStr(b.createdAt), render: b => toDateStr(b.createdAt) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Businesses</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{displayed.length} of {rows.length} on this page — click a row to manage.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} title="Add Business"><Plus size={16} /></button>
      </div>

      {!statCounts ? (
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, i) => <Sk key={i} h="88px" r="var(--radius)" />)}
        </div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card stat-card--primary">
            <div className="stat-icon"><Building2 size={20} /></div>
            <div><div className="stat-value">{statCounts.total}</div><div className="stat-label">Businesses ({statCounts.active} active)</div></div>
          </div>
          <div className="stat-card stat-card--green">
            <div className="stat-icon"><Radio size={20} /></div>
            <div><div className="stat-value">{liveUserCount}</div><div className="stat-label">Business owners online</div></div>
          </div>
          <div className="stat-card stat-card--blue">
            <div className="stat-icon"><Clock size={20} /></div>
            <div><div className="stat-value">{statCounts.trial}</div><div className="stat-label">In trial</div></div>
          </div>
          <div className="stat-card stat-card--amber">
            <div className="stat-icon"><AlertTriangle size={20} /></div>
            <div><div className="stat-value">{statCounts.expiringSoon}</div><div className="stat-label">Expiring within 7 days</div></div>
          </div>
          <div className="stat-card stat-card--red">
            <div className="stat-icon"><Ban size={20} /></div>
            <div><div className="stat-value">{statCounts.expired}</div><div className="stat-label">Subscription expired</div></div>
          </div>
          {TYPES.map((t, i) => {
            const Icon = TYPE_ICONS[t];
            return (
              <div key={t} className={`stat-card stat-card--${STAT_COLORS[i % STAT_COLORS.length]}`}>
                <div className="stat-icon"><Icon size={20} /></div>
                <div><div className="stat-value">{statCounts.byType[t]}</div><div className="stat-label">{TYPE_LABELS[t]}</div></div>
              </div>
            );
          })}
        </div>
      )}

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search name or address…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="form-control" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={subFilter} onChange={e => setSubFilter(e.target.value)}>
              <option value="all">All subscriptions</option>
              <option value="trial">Trial</option>
              <option value="subscribed">Subscribed</option>
              <option value="expired">Expired</option>
              <option value="legacy">Legacy</option>
            </select>
            <select className="form-control" style={{ width: 'auto' }} value={pageSize} onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n === 'all' ? 'Show All' : `Show ${n}`}</option>)}
            </select>
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
            emptyMessage="No businesses found."
            onRowClick={b => navigate(`/superadmin/businesses/${b.id}`)}
            exportable
            exportFilename="businesses.csv"
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Page {page + 1} — {rows.length} shown</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" disabled={loading || !hasPrev} onClick={prevPage}>Previous</button>
          <button className="btn btn-ghost btn-sm" disabled={loading || !hasMore} onClick={nextPage}>Next</button>
        </div>
      </div>

      <Modal open={showCreate} onClose={closeCreate} title="Add Business">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Business Name *</label>
            <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-control" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Owner UID</label>
            <input className="form-control" value={form.adminUid} placeholder="Paste from Users → UID column"
              onChange={e => setForm(f => ({ ...f, adminUid: e.target.value }))} />
            <p className="form-hint">Optional — links this business to a businessAdmin account (sets their Business ID too). Leave blank to assign later.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={closeCreate}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} title="Create Business">
              <Save size={16} />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
