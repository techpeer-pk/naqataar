import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit2, Trash2, Search, Copy, Plus, Save, Eye, Fingerprint, Clock, Radio, Users as UsersIcon, Building2, Ban, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { collection, doc, getDoc, getDocs, getCountFromServer, query, where } from 'firebase/firestore';
import { startOfDay, startOfWeek, startOfMonth, format as formatDate } from 'date-fns';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { db } from '../../firebase';
import { useUsers } from '../../hooks/useUsers';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useVisitorStats, useVisitorLogs, formatTimeAgo } from '../../hooks/useVisitorCounter';
import { useLiveUserCount, useLastSeenMap, useSessionStartMap, useIsOnline } from '../../hooks/usePresence';
import { filterBySearch } from '../../utils/search';
import { formatDuration } from '../../utils/format';
import { CHART_COLORS, CHART_GRID, CHART_AXIS, CHART_TOOLTIP, formatCompactNumber } from '../../utils/chartPalette';
import DataTable from '../../components/superadmin/DataTable';
import PresenceDot from '../../components/superadmin/PresenceDot';
import Modal from '../../components/superadmin/Modal';
import Sk from '../../components/shared/Skeleton';
import '../admin/Dashboard.css';
import '../admin/AppointmentsPage.css';

const ROLES = ['customer', 'businessAdmin'];
const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 'all'];
const EMPTY_FORM = { displayName: '', email: '', password: '', phone: '', role: 'customer', businessId: '', isTester: false };

// Same preset/custom-range pattern ReportsPage uses for revenue, applied to
// the RTDB visitor logs (visitors/daily, visitors/unique — see
// useVisitorCounter.js) since that's what this page's stat cards are
// actually built on, not the Firestore `users` collection.
const RANGE_PRESETS = [
  { key: 'today', label: 'Today', from: () => startOfDay(new Date()) },
  { key: 'week',  label: 'Week',  from: () => startOfWeek(new Date()) },
  { key: 'month', label: 'Month', from: () => startOfMonth(new Date()) },
];
const DAY_MS = 86400000;

function toMillis(ts) {
  if (!ts) return null;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : null;
}

function toDateStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleDateString() : '—';
}

// Own component (not inlined in the column's render) so useIsOnline can be
// called per row — same reason PresenceDot is a component, not a function.
function LastSeenCell({ uid, lastSeen }) {
  const online = useIsOnline(uid);
  if (online) return <span style={{ color: 'var(--success, #16a34a)' }}>Online now</span>;
  return <span>{formatTimeAgo(lastSeen)}</span>;
}

// Ticks its own re-render every 30s so a live session's duration keeps
// counting up without the whole table re-rendering on a timer.
function SessionDurationCell({ sessionStart }) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!sessionStart) return;
    const id = setInterval(() => forceTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, [sessionStart]);
  if (!sessionStart) return <span>—</span>;
  return <span>{formatDuration(Date.now() - sessionStart)}</span>;
}

export default function UsersPage() {
  const { rows, setRows, loading, hasMore, hasPrev, page, pageSize, setPageSize, nextPage, prevPage, reload } = usePaginatedCollection('users', { mode: 'page', pageSize: 10 });
  const { create, update, remove } = useUsers();
  const { log } = useAuditLog();
  const visitorStats = useVisitorStats();
  const liveUserCount = useLiveUserCount();
  const lastSeenMap = useLastSeenMap();
  const sessionStartMap = useSessionStartMap();
  const { daily, unique } = useVisitorLogs();

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [roleFilter, setRoleFilter] = useState('all');
  const [testersOnly, setTestersOnly] = useState(false);

  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [modalTarget, setModalTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Read-only allowlist membership, for display only — never editable here.
  // The real grant/revoke is Console-only (config/{superAdmins,eatsAdmins,csrAgents}.uids).
  const [staffLabels, setStaffLabels] = useState({});

  const [rangePreset, setRangePreset] = useState('today');
  const [rangeCustomFrom, setRangeCustomFrom] = useState('');
  const [rangeCustomTo, setRangeCustomTo] = useState('');

  const range = useMemo(() => {
    if (rangePreset === 'custom') {
      const from = rangeCustomFrom ? new Date(rangeCustomFrom).getTime() : 0;
      const to = rangeCustomTo ? startOfDay(new Date(rangeCustomTo)).getTime() + DAY_MS : Date.now() + 1;
      return { from, to };
    }
    const p = RANGE_PRESETS.find(p => p.key === rangePreset);
    return { from: p.from().getTime(), to: Date.now() + 1 };
  }, [rangePreset, rangeCustomFrom, rangeCustomTo]);

  // visitors/daily is keyed by Date#toDateString() (see useVisitorCounter.js
  // recordVisit) — walk the range one calendar day at a time and sum hits.
  const rangeVisits = useMemo(() => {
    let sum = 0;
    for (let t = range.from; t < range.to; t += DAY_MS) sum += daily[new Date(t).toDateString()] || 0;
    return sum;
  }, [daily, range]);

  const rangeUniqueVisitors = useMemo(
    () => Object.values(unique).filter(v => v.firstVisit >= range.from && v.firstVisit < range.to).length,
    [unique, range],
  );

  const rangeLabel = RANGE_PRESETS.find(p => p.key === rangePreset)?.label || 'Custom range';

  // Bar+Line combo, one shared count axis — visits and new unique visitors
  // are the same unit, so this isn't a dual-axis chart. Only meaningful once
  // the range spans more than a single day (a 1-bar chart is just the stat
  // tile above, restated).
  const daySpan = Math.round((range.to - range.from) / DAY_MS);
  const byDay = useMemo(() => {
    if (daySpan <= 1) return [];
    const days = [];
    for (let t = range.from; t < range.to; t += DAY_MS) days.push(new Date(t));
    const newUniqueByDay = {};
    Object.values(unique).forEach(v => {
      if (v.firstVisit >= range.from && v.firstVisit < range.to) {
        const key = new Date(v.firstVisit).toDateString();
        newUniqueByDay[key] = (newUniqueByDay[key] || 0) + 1;
      }
    });
    return days.map(d => ({
      date: formatDate(d, 'MMM d'),
      visits: daily[d.toDateString()] || 0,
      newUnique: newUniqueByDay[d.toDateString()] || 0,
    }));
  }, [daily, unique, range, daySpan]);

  // Role split is a straight 2-way count (customer vs businessAdmin) — a
  // 2-slice pie is a known anti-pattern (a stat tile says it better), and
  // this needs the whole collection's true count, not just what's
  // paginated into `rows`, so it's a lightweight server-side aggregation.
  const [roleCounts, setRoleCounts] = useState({ total: 0, businessAdmin: 0 });
  useEffect(() => {
    (async () => {
      const [totalSnap, adminSnap] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'businessAdmin'))),
      ]);
      setRoleCounts({ total: totalSnap.data().count, businessAdmin: adminSnap.data().count });
    })();
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    (async () => {
      const [superSnap, eatsSnap, csrSnap] = await Promise.all([
        getDoc(doc(db, 'config', 'superAdmins')),
        getDoc(doc(db, 'config', 'eatsAdmins')),
        getDoc(doc(db, 'config', 'csrAgents')),
      ]);
      const labels = {};
      (eatsSnap.data()?.uids || []).forEach(uid => { labels[uid] = 'Ops'; });
      (csrSnap.data()?.uids || []).forEach(uid => { labels[uid] = 'CSR'; });
      (superSnap.data()?.uids || []).forEach(uid => { labels[uid] = 'SuperAdmin'; });
      setStaffLabels(labels);
    })();
  }, []);

  const displayed = useMemo(() => {
    const searched = filterBySearch(rows, search, ['displayName', 'email', 'id']);
    const roleMatched = roleFilter === 'all' ? searched : searched.filter(u => (u.role || 'customer') === roleFilter);
    return testersOnly ? roleMatched.filter(u => u.isTester) : roleMatched;
  }, [rows, search, roleFilter, testersOnly]);

  const copyUid = (uid) => {
    navigator.clipboard.writeText(uid);
    toast.success('UID copied.');
  };

  const openCreate = () => { setForm(EMPTY_FORM); setModalTarget(null); setModalMode('create'); };
  const openEdit = (u) => {
    setForm({ displayName: u.displayName || '', email: u.email || '', password: '', phone: u.phone || '', role: u.role || 'customer', businessId: u.businessId || '', isTester: u.isTester || false });
    setModalTarget(u);
    setModalMode('edit');
  };
  const closeModal = () => setModalMode(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === 'create') {
        if (form.password.length < 6) { toast.error('Password must be at least 6 characters.'); setSaving(false); return; }
        const uid = await create({
          email: form.email.trim().toLowerCase(), password: form.password,
          displayName: form.displayName.trim(), phone: form.phone.trim(),
          role: form.role, businessId: form.businessId.trim() || null, isTester: form.isTester,
        });
        await log({ action: 'create', targetCollection: 'users', docId: uid, summary: `${form.email}: created as ${form.role}` });
        setRows(prev => [{ id: uid, uid, email: form.email.trim().toLowerCase(), displayName: form.displayName.trim(), phone: form.phone.trim(), role: form.role, businessId: form.businessId.trim() || null, isTester: form.isTester }, ...prev]);
        toast.success('User created.');
      } else {
        const data = { displayName: form.displayName.trim(), phone: form.phone.trim(), role: form.role, businessId: form.businessId.trim() || null, isTester: form.isTester };
        await update(modalTarget.id, data);
        await log({ action: 'update', targetCollection: 'users', docId: modalTarget.id, summary: `${modalTarget.email}: role→${data.role}, businessId→${data.businessId || '—'}` });
        setRows(prev => prev.map(r => r.id === modalTarget.id ? { ...r, ...data } : r));
        toast.success('User updated.');
      }
      closeModal();
    } catch (err) {
      toast.error(err.code === 'auth/email-already-in-use' ? 'Email already registered.' : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u) => {
    let warning = '';
    if (u.role === 'businessAdmin') {
      const ownedSnap = await getDocs(query(collection(db, 'businesses'), where('adminUid', '==', u.id)));
      if (!ownedSnap.empty) {
        const names = ownedSnap.docs.map(d => d.data().name).join(', ');
        warning = `\n\nWARNING: this account owns ${ownedSnap.size} business(es) (${names}) — deleting the profile will NOT delete those businesses, leaving them orphaned with no linked admin.`;
      }
    }
    if (!confirm(`Delete profile for "${u.email}"? This removes their Firestore profile only — their login account stays active.${warning}`)) return false;
    await remove(u.id);
    await log({ action: 'delete', targetCollection: 'users', docId: u.id, summary: u.email });
    setRows(prev => prev.filter(r => r.id !== u.id));
    toast.success('User profile deleted.');
    return true;
  };

  const handleToggleActive = async (u) => {
    const isCurrentlyActive = u.isActive !== false;
    const next = !isCurrentlyActive;
    await update(u.id, { isActive: next });
    await log({ action: 'update', targetCollection: 'users', docId: u.id, summary: `${u.email}: ${next ? 'reactivated' : 'deactivated'}` });
    setRows(prev => prev.map(r => r.id === u.id ? { ...r, isActive: next } : r));
    setModalTarget(prev => (prev && prev.id === u.id) ? { ...prev, isActive: next } : prev);
    toast.success(next ? 'User reactivated.' : 'User deactivated — new bookings/orders will be blocked.');
  };

  const columns = [
    { key: 'name', header: 'Name', sortable: true, sortValue: u => (u.displayName || u.email || '').toLowerCase(), exportValue: u => u.displayName || u.email || '', render: u => (
      <>
        <p className="customer-name">{u.displayName || '—'}<PresenceDot uid={u.id} /></p>
        <p className="customer-contact">{u.email}</p>
      </>
    ) },
    { key: 'email', header: 'Email', sortable: true, sortValue: u => (u.email || '').toLowerCase(), render: u => u.email || '—' },
    { key: 'uid', header: 'UID', sortable: true, stopRowClick: true, render: u => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span className="booking-ref-cell" style={{ color: 'var(--text-muted)' }}>{u.id}</span>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} onClick={() => copyUid(u.id)} title="Copy UID">
          <Copy size={13} />
        </button>
      </div>
    ) },
    { key: 'role', header: 'Role', sortable: true, sortValue: u => u.role || 'customer', render: u => (
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        <span className={`badge badge-${u.role === 'businessAdmin' ? 'confirmed' : u.role === 'SuperAdmin' ? 'superadmin' : 'customer'}`}>{u.role || 'customer'}</span>
        {staffLabels[u.id] && (
          <span
            className={`badge ${staffLabels[u.id] === 'SuperAdmin' ? 'badge-superadmin' : 'badge-staff'}`}
            title="Allowlist membership — Console-only, see config/*"
          >
            {staffLabels[u.id]}
          </span>
        )}
        {u.isTester && <span className="badge badge-completed" title="Marked as a Play Store closed-testing tester">Tester</span>}
      </div>
    ) },
    { key: 'isActive', header: 'Status', sortable: true, sortValue: u => (u.isActive !== false ? 1 : 0), exportValue: u => u.isActive !== false ? 'Active' : 'Inactive', render: u => (
      <span className={`badge badge-${u.isActive !== false ? 'confirmed' : 'cancelled'}`}>{u.isActive !== false ? 'Active' : 'Inactive'}</span>
    ) },
    { key: 'createdAt', header: 'Joined', sortable: true, sortValue: u => toMillis(u.createdAt) || 0, exportValue: u => toDateStr(u.createdAt), render: u => toDateStr(u.createdAt) },
    { key: 'lastSeen', header: 'Last Seen', sortable: true, sortValue: u => lastSeenMap[u.id] || 0, exportValue: u => lastSeenMap[u.id] ? formatTimeAgo(lastSeenMap[u.id]) : '—', render: u => <LastSeenCell uid={u.id} lastSeen={lastSeenMap[u.id]} /> },
    { key: 'sessionDuration', header: 'Session', sortable: true, sortValue: u => sessionStartMap[u.id] ? Date.now() - sessionStartMap[u.id] : -1, exportValue: u => sessionStartMap[u.id] ? formatDuration(Date.now() - sessionStartMap[u.id]) : '—', render: u => <SessionDurationCell sessionStart={sessionStartMap[u.id]} /> },
    { key: 'actions', header: 'Actions', stopRowClick: true, noExport: true, render: u => (
      <div className="action-btns">
        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} title="Edit"><Edit2 size={14} /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Users</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{displayed.length} of {rows.length} on this page</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate} title="Add User"><Plus size={16} /></button>
      </div>

      <div className="status-filter-tabs" style={{ marginBottom: '0.75rem' }}>
        {RANGE_PRESETS.map(p => (
          <button key={p.key} className={`status-tab ${rangePreset === p.key ? 'active' : ''}`} onClick={() => setRangePreset(p.key)}>{p.label}</button>
        ))}
        <button className={`status-tab ${rangePreset === 'custom' ? 'active' : ''}`} onClick={() => setRangePreset('custom')}>Custom</button>
      </div>

      {rangePreset === 'custom' && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From</label>
              <input type="date" className="form-control" value={rangeCustomFrom} onChange={e => setRangeCustomFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To</label>
              <input type="date" className="form-control" value={rangeCustomTo} onChange={e => setRangeCustomTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-icon"><Eye size={20} /></div>
          <div><div className="stat-value">{rangeVisits}</div><div className="stat-label">Visits — {rangeLabel}</div></div>
        </div>
        <div className="stat-card stat-card--blue">
          <div className="stat-icon"><Fingerprint size={20} /></div>
          <div><div className="stat-value">{rangeUniqueVisitors}</div><div className="stat-label">New unique visitors — {rangeLabel}</div></div>
        </div>
        <div className="stat-card stat-card--amber">
          <div className="stat-icon"><Clock size={20} /></div>
          <div><div className="stat-value">{formatTimeAgo(visitorStats.lastVisit)}</div><div className="stat-label">Last visit</div></div>
        </div>
        <div className="stat-card stat-card--green">
          <div className="stat-icon"><Radio size={20} /></div>
          <div><div className="stat-value">{liveUserCount}</div><div className="stat-label">Live users now</div></div>
        </div>
      </div>

      {byDay.length > 0 && (
        <div className="card" style={{ marginTop: '1.25rem', padding: '1.5rem 1.5rem 0.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Visits &amp; new unique visitors — {rangeLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={byDay} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} width={32} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="visits" name="Visits" fill={CHART_COLORS.navy} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Line type="monotone" dataKey="newUnique" name="New unique visitors" stroke={CHART_COLORS.orange} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.orange }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Registered accounts, not visitor traffic — kept in its own block so
          it doesn't blur into the RTDB-based cards above (that mix-up is
          exactly what looked "static" before). Two categories only, so this
          is two stat tiles rather than a pie — see dataviz skill's
          anti-patterns (a 2-slice pie is a stat tile wearing a costume). */}
      <div className="stats-grid" style={{ marginTop: '1.25rem' }}>
        <div className="stat-card stat-card--primary">
          <div className="stat-icon"><UsersIcon size={20} /></div>
          <div><div className="stat-value">{roleCounts.total - roleCounts.businessAdmin}</div><div className="stat-label">Customers</div></div>
        </div>
        <div className="stat-card stat-card--blue">
          <div className="stat-icon"><Building2 size={20} /></div>
          <div><div className="stat-value">{roleCounts.businessAdmin}</div><div className="stat-label">Business admins</div></div>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search name or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={testersOnly} onChange={e => setTestersOnly(e.target.checked)} />
            Testers only
          </label>
          <select className="form-control" style={{ width: 'auto' }} value={pageSize} onChange={e => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n === 'all' ? 'Show All' : `Show ${n}`}</option>)}
          </select>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable columns={columns} rows={displayed} emptyMessage="No users found." exportable exportFilename="users.csv" />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Page {page + 1} — {rows.length} shown</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost btn-sm" disabled={loading || !hasPrev} onClick={prevPage}>Previous</button>
          <button className="btn btn-ghost btn-sm" disabled={loading || !hasMore} onClick={nextPage}>Next</button>
        </div>
      </div>

      <Modal open={!!modalMode} onClose={closeModal} title={modalMode === 'create' ? 'Add User' : 'Edit User'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-control" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Email {modalMode === 'edit' && '(read-only)'}</label>
            <input className="form-control" type="email" value={form.email} disabled={modalMode === 'edit'}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required={modalMode === 'create'} />
          </div>
          {modalMode === 'create' && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-control" type="password" minLength={6} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-control" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Business ID</label>
              <input className="form-control" value={form.businessId} placeholder="—"
                onChange={e => setForm(f => ({ ...f, businessId: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={form.isTester} onChange={e => setForm(f => ({ ...f, isTester: e.target.checked }))} />
              Tester (Play Store closed testing)
            </label>
          </div>
          {modalMode === 'edit' && modalTarget && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
              <span className={`badge badge-${modalTarget.isActive !== false ? 'confirmed' : 'cancelled'}`}>
                {modalTarget.isActive !== false ? 'Active' : 'Inactive'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(modalTarget)}>
                  {modalTarget.isActive !== false ? <><Ban size={14} /> Deactivate</> : <><CheckCircle2 size={14} /> Reactivate</>}
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={async () => { if (await handleDelete(modalTarget)) closeModal(); }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} title={modalMode === 'create' ? 'Create User' : 'Save Changes'}>
              <Save size={16} />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
