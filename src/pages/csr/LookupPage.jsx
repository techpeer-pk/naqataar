import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Store, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useAuth } from '../../context/AuthContext';
import { accountRef } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

// Not a secret — an internal doc id, already visible in the /qufreecrm/subject/:type/:id
// URL. CSR agents need it to give SuperAdmin/Ops an unambiguous reference when
// escalating (see docs/CRM-Support.md). Same UX as UsersPage.jsx's copyUid.
function copyId(id) {
  navigator.clipboard.writeText(id);
  toast.success('ID copied.');
}

// '_ref' is synthetic (accountRef of the uid) so a caller's spoken Support ID
// ("QU-XLDQC3" or just "XLDQC3") is searchable, not just the raw uid.
const USER_FIELDS     = ['displayName', 'email', 'phone', 'role', 'id', '_ref'];
const BUSINESS_FIELDS = ['name', 'phone', 'address', 'type', 'id'];

// A CSR agent might paste a uid, a phone digit-string, or two words from a
// name and an email — every space-separated term must match *some* field
// (AND across terms, OR across fields), not one literal substring.
function multiTermSearch(rows, term, fields) {
  const terms = term.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;
  return rows.filter(row =>
    terms.every(t => fields.some(f => String(row[f] ?? '').toLowerCase().includes(t)))
  );
}

// Phase A: client-side search over the full loaded page(s) — see
// docs/CRM-Support.md Open Question #1 for the scaling follow-up.
export default function LookupPage() {
  const [subjectType, setSubjectType] = useState('user'); // 'user' | 'business'
  const users      = usePaginatedCollection('users');
  const businesses = usePaginatedCollection('businesses');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { users.reload(); businesses.reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const active = subjectType === 'user' ? users : businesses;
  const fields = subjectType === 'user' ? USER_FIELDS : BUSINESS_FIELDS;
  const displayed = useMemo(() => {
    // CSR agents authenticate through the same `users` collection they're
    // browsing — exclude their own account, it's never a support subject.
    const rows = subjectType === 'user'
      ? active.rows.filter(r => r.id !== user?.uid).map(r => ({ ...r, _ref: accountRef(r.id) }))
      : active.rows;
    return multiTermSearch(rows, search, fields);
  }, [active.rows, search, fields, subjectType, user]);

  const userColumns = [
    { key: 'name', header: 'Name', sortable: true, sortValue: u => (u.displayName || u.email || '').toLowerCase(), render: u => (
      <>
        <p className="customer-name">{u.displayName || '—'}</p>
        <p className="customer-contact">{u.email}</p>
      </>
    ) },
    { key: 'phone', header: 'Phone', sortable: true, render: u => u.phone || '—' },
    { key: 'role', header: 'Role', sortable: true, sortValue: u => u.role || 'customer', render: u => (
      <span className={`badge badge-${u.role === 'businessAdmin' ? 'confirmed' : 'clinic'}`}>{u.role || 'customer'}</span>
    ) },
    { key: 'uid', header: 'Support ID / UID', stopRowClick: true, render: u => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div>
          <p className="booking-ref-cell" style={{ fontWeight: 600 }}>{accountRef(u.id)}</p>
          <p className="customer-contact" style={{ fontSize: '0.72rem' }}>{u.id}</p>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} onClick={() => copyId(u.id)} title="Copy full UID">
          <Copy size={13} />
        </button>
      </div>
    ) },
  ];

  const businessColumns = [
    { key: 'name', header: 'Business', sortable: true, sortValue: b => (b.name || '').toLowerCase(), render: b => (
      <>
        <p className="customer-name">{b.name}</p>
        <p className="customer-contact">{b.address || '—'}</p>
      </>
    ) },
    { key: 'phone', header: 'Phone', sortable: true, render: b => b.phone || '—' },
    { key: 'type', header: 'Type', sortable: true, render: b => b.type || '—' },
    { key: 'isActive', header: 'Status', sortable: true, sortValue: b => (b.isActive ? 1 : 0), render: b => (
      <span className={`badge badge-${b.isActive ? 'confirmed' : 'cancelled'}`}>{b.isActive ? 'Active' : 'Inactive'}</span>
    ) },
    { key: 'id', header: 'Business ID', stopRowClick: true, render: b => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span className="booking-ref-cell" style={{ color: 'var(--text-muted)' }}>{b.id}</span>
        <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} onClick={() => copyId(b.id)} title="Copy Business ID">
          <Copy size={13} />
        </button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Lookup</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Find a customer or business by name, email or phone.
          </p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn btn-sm ${subjectType === 'user' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSubjectType('user')}
            >
              <User size={14} /> Customers
            </button>
            <button
              className={`btn btn-sm ${subjectType === 'business' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSubjectType('business')}
            >
              <Store size={14} /> Businesses
            </button>
          </div>
          <div className="input-icon-wrap" style={{ maxWidth: '320px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search name, email, phone, UID, Support ID…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {active.loading && active.rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable
            columns={subjectType === 'user' ? userColumns : businessColumns}
            rows={displayed}
            emptyMessage="No matches."
            onRowClick={row => navigate(`/qufreecrm/subject/${subjectType}/${row.id}`)}
          />
        </div>
      )}

      {active.hasMore && (
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }} disabled={active.loading} onClick={active.loadMore}>
          {active.loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
