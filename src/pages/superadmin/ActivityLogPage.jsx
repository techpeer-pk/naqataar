import { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { filterBySearch } from '../../utils/search';
import DataTable from '../../components/superadmin/DataTable';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const ACTIONS = ['create', 'update', 'delete'];

function toMillis(ts) {
  if (!ts) return 0;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0;
}

function toDateTimeStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleString() : '—';
}

export default function ActivityLogPage() {
  const { rows, loading, hasMore, loadMore, reload } = usePaginatedCollection('auditLog', { pageSize: 50, orderByField: 'timestamp' });

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => { reload(); }, [reload]);

  const displayed = useMemo(() => {
    const searched = filterBySearch(rows, search, ['actorEmail', 'summary', 'targetCollection']);
    return actionFilter === 'all' ? searched : searched.filter(r => r.action === actionFilter);
  }, [rows, search, actionFilter]);

  const columns = [
    { key: 'timestamp', header: 'When', sortable: true, sortValue: r => toMillis(r.timestamp),
      render: r => <span style={{ whiteSpace: 'nowrap' }}>{toDateTimeStr(r.timestamp)}</span> },
    { key: 'actorEmail', header: 'Actor', sortable: true, render: r => r.actorEmail || '—' },
    { key: 'action', header: 'Action', sortable: true, render: r => (
      <span className={`badge badge-${r.action === 'delete' ? 'cancelled' : r.action === 'create' ? 'confirmed' : 'clinic'}`}>{r.action}</span>
    ) },
    { key: 'targetCollection', header: 'Target', sortable: true, render: r => r.targetCollection },
    { key: 'summary', header: 'Summary', sortable: true, render: r => r.summary },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Activity Log</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Every SuperAdmin change, newest first — append-only.</p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search actor or summary…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="all">All actions</option>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 6 }).map((_, i) => <Sk key={i} h="48px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable columns={columns} rows={displayed} emptyMessage="No activity recorded yet." />
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
