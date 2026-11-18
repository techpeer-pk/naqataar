import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import DataTable from '../../components/superadmin/DataTable';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

function toMillis(ts) {
  if (!ts) return 0;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0;
}
function toDateStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleString() : '—';
}
function isDueToday(followUpAt) {
  if (!followUpAt) return false;
  const due = new Date(toMillis(followUpAt));
  const now = new Date();
  return due.toDateString() === now.toDateString() || due < now;
}

export default function TicketsQueuePage() {
  const { tickets, loading, fetchAll } = useSupportTickets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const searched = !q ? tickets : tickets.filter(t =>
      (t.reason || '').toLowerCase().includes(q) || (t.subjectSnapshot?.name || '').toLowerCase().includes(q)
    );
    return statusFilter === 'all' ? searched : searched.filter(t => t.status === statusFilter);
  }, [tickets, search, statusFilter]);

  const dueToday = useMemo(() => tickets.filter(t => t.status === 'open' && isDueToday(t.followUpAt)), [tickets]);

  const columns = [
    { key: 'subject', header: 'Subject', sortable: true, sortValue: t => (t.subjectSnapshot?.name || '').toLowerCase(), render: t => (
      <>
        <p className="customer-name">{t.subjectSnapshot?.name || '—'}</p>
        <p className="customer-contact">{t.subjectSnapshot?.email || t.subjectSnapshot?.phone || ''}</p>
      </>
    ) },
    { key: 'reason', header: 'Reason', sortable: true, render: t => t.reason || '—' },
    { key: 'channel', header: 'Channel', sortable: true, render: t => t.channel },
    { key: 'status', header: 'Status', sortable: true, render: t => (
      <span className={`badge badge-${t.status === 'open' ? 'pending' : t.status === 'escalated' ? 'cancelled' : 'confirmed'}`}>{t.status}</span>
    ) },
    { key: 'followUpAt', header: 'Follow-up', sortable: true, sortValue: t => toMillis(t.followUpAt), render: t => (
      t.followUpAt ? <span style={{ color: isDueToday(t.followUpAt) ? 'var(--danger, #EF4444)' : undefined }}>{toDateStr(t.followUpAt)}</span> : '—'
    ) },
    { key: 'createdAt', header: 'Logged', sortable: true, sortValue: t => toMillis(t.createdAt), render: t => toDateStr(t.createdAt) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Tickets</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {displayed.length} shown{dueToday.length > 0 ? ` · ${dueToday.length} follow-up${dueToday.length === 1 ? '' : 's'} due` : ''}
          </p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search reason or name…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="open">Open</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {loading && tickets.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable columns={columns} rows={displayed} emptyMessage="No tickets." onRowClick={t => navigate(`/qufreecrm/tickets/${t.id}`)} />
        </div>
      )}
    </div>
  );
}
