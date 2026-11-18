import { useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { Search } from 'lucide-react';
import rtdb from '../../rtdb';
import { filterBySearch } from '../../utils/search';
import { formatDuration } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

export default function CsrActivityLogPage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    const unsub = onValue(ref(rtdb, 'csrSessionLogs'), (snap) => {
      const list = [];
      snap.forEach((child) => list.push({ id: child.key, ...child.val() }));
      list.sort((a, b) => (b.loginAt || 0) - (a.loginAt || 0));
      setRows(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const displayed = useMemo(() => filterBySearch(rows, search, ['email', 'uid']), [rows, search]);

  const columns = [
    { key: 'loginAt', header: 'Login', sortable: true, sortValue: r => r.loginAt || 0,
      exportValue: r => r.loginAt ? new Date(r.loginAt).toLocaleString() : '—',
      render: r => <span style={{ whiteSpace: 'nowrap' }}>{r.loginAt ? new Date(r.loginAt).toLocaleString() : '—'}</span> },
    { key: 'logoutAt', header: 'Logout', sortable: true, sortValue: r => r.logoutAt || 0,
      exportValue: r => r.logoutAt ? new Date(r.logoutAt).toLocaleString() : '—',
      render: r => <span style={{ whiteSpace: 'nowrap' }}>{r.logoutAt ? new Date(r.logoutAt).toLocaleString() : '—'}</span> },
    { key: 'email', header: 'CSR Agent', sortable: true, render: r => r.email || '—' },
    { key: 'sessionDuration', header: 'Duration', sortable: true, sortValue: r => r.sessionDuration || 0,
      exportValue: r => formatDuration(r.sessionDuration || 0), render: r => formatDuration(r.sessionDuration || 0) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>CSR Activity</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Every completed CSR login session, newest first — not visible from /qufreecrm itself.
          </p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => <Sk key={i} h="48px" r="10px" />)}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={displayed}
          exportable
          exportFilename="csr-activity.csv"
          paginated
          defaultSortKey="loginAt"
          defaultSortDir="desc"
          emptyMessage="No CSR login activity yet."
        />
      )}
    </div>
  );
}
