import { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { filterBySearch } from '../../utils/search';
import { formatDuration } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

function toMillis(ts) {
  if (!ts) return 0;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0;
}

function toDateTimeStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleString() : '—';
}

export default function SessionLogsPage() {
  const { rows, loading, hasMore, loadMore, reload } = usePaginatedCollection('sessionLogs', { pageSize: 50, orderByField: 'createdAt' });

  const [search, setSearch] = useState('');

  useEffect(() => { reload(); }, [reload]);

  const displayed = useMemo(() => filterBySearch(rows, search, ['email', 'uid']), [rows, search]);

  const columns = [
    { key: 'loginAt', header: 'Login', sortable: true, sortValue: r => toMillis(r.loginAt),
      exportValue: r => toDateTimeStr(r.loginAt), render: r => <span style={{ whiteSpace: 'nowrap' }}>{toDateTimeStr(r.loginAt)}</span> },
    { key: 'email', header: 'Email', sortable: true, render: r => r.email || '—' },
    { key: 'sessionDuration', header: 'Duration', sortable: true, sortValue: r => r.sessionDuration || 0,
      exportValue: r => formatDuration(r.sessionDuration || 0), render: r => formatDuration(r.sessionDuration || 0) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Session Logs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Every completed login session, newest first — logged when a user's last tab disconnects.</p>
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
        <div style={{ marginTop: '1rem' }}>
          <DataTable columns={columns} rows={displayed} emptyMessage="No sessions logged yet." exportable exportFilename="session-logs.csv" />
        </div>
      )}

      {hasMore && (
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }} disabled={loading} onClick={loadMore}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
