import { useEffect, useState, useMemo } from 'react';
import { Search, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvoices } from '../../hooks/useInvoices';
import { useAuditLog } from '../../hooks/useAuditLog';
import { invoiceRef } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import Sk from '../../components/shared/Skeleton';
import InvoiceDetailModal from '../../components/shared/InvoiceDetailModal';
import '../admin/AppointmentsPage.css';

function toMillis(ts) {
  if (!ts) return 0;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0;
}
function toDateStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleDateString() : '—';
}

// Every invoice ever issued when SuperAdmin activates/extends a business's
// subscription — see docs/Billing-Subscription.md.
export default function InvoicesPage() {
  const { invoices, loading, fetchAll, update, remove } = useInvoices();
  const { log } = useAuditLog();
  const [search, setSearch] = useState('');
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(inv =>
      (inv.businessName || '').toLowerCase().includes(q) || invoiceRef(inv.id).toLowerCase().includes(q)
    );
  }, [invoices, search]);

  // Hidden invoices stay fully visible/manageable here — only the owning
  // business's own /admin/invoices view excludes them (firestore.rules).
  const handleToggleHidden = async (inv) => {
    const next = !inv.hidden;
    setActionLoading(inv.id + 'hide');
    try {
      await update(inv.id, { hidden: next });
      await log({ action: 'update', targetCollection: 'invoices', docId: inv.id, summary: `${invoiceRef(inv.id)} (${inv.businessName}): ${next ? 'hidden from' : 'shown to'} business` });
      fetchAll();
      toast.success(next ? 'Invoice hidden from business.' : 'Invoice shown to business.');
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (inv) => {
    if (!confirm(`Permanently delete invoice ${invoiceRef(inv.id)} (${inv.businessName})? This cannot be undone.`)) return;
    setActionLoading(inv.id + 'delete');
    try {
      await remove(inv.id);
      await log({ action: 'delete', targetCollection: 'invoices', docId: inv.id, summary: `${invoiceRef(inv.id)} (${inv.businessName})` });
      fetchAll();
      toast.success('Invoice deleted.');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    { key: 'ref', header: 'Invoice #', sortable: true, sortValue: inv => invoiceRef(inv.id),
      render: inv => (
        <>
          <span className="booking-ref-cell">{invoiceRef(inv.id)}</span>
          {inv.hidden && <span className="badge badge-cancelled" title="Hidden from the business's own Invoices view">Hidden</span>}
        </>
      ) },
    { key: 'businessName', header: 'Business', sortable: true, render: inv => inv.businessName },
    { key: 'amount', header: 'Amount', sortable: true, sortValue: inv => inv.amount || 0,
      render: inv => `PKR ${Number(inv.amount || 0).toLocaleString()}` },
    { key: 'period', header: 'Period', render: inv => (
      <span style={{ fontSize: '0.85rem' }}>
        {inv.periodStart ? toDateStr(inv.periodStart) : '—'} → {toDateStr(inv.periodEnd)}
      </span>
    ) },
    { key: 'createdAt', header: 'Issued', sortable: true, sortValue: inv => toMillis(inv.createdAt), render: inv => toDateStr(inv.createdAt) },
    { key: 'actions', header: 'Actions', stopRowClick: true, render: inv => (
      <div className="action-btns">
        <button className="btn btn-ghost btn-sm" disabled={actionLoading === inv.id + 'hide'}
          onClick={() => handleToggleHidden(inv)} title={actionLoading === inv.id + 'hide' ? 'Please wait…' : (inv.hidden ? 'Show to business' : 'Hide from business')}>
          {actionLoading === inv.id + 'hide' ? <Loader2 size={14} className="icon-spin" /> : (inv.hidden ? <EyeOff size={14} /> : <Eye size={14} />)}
        </button>
        <button className="btn btn-danger btn-sm" disabled={actionLoading === inv.id + 'delete'}
          onClick={() => handleDelete(inv)} title={actionLoading === inv.id + 'delete' ? 'Please wait…' : 'Delete'}>
          {actionLoading === inv.id + 'delete' ? <Loader2 size={14} className="icon-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    ) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Invoices</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {invoices.length} issued — one per subscription activation/extension.
          </p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search business or invoice #…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading && invoices.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h="48px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable columns={columns} rows={displayed} emptyMessage="No invoices issued yet." onRowClick={setDetailInvoice} />
        </div>
      )}

      <InvoiceDetailModal invoice={detailInvoice} open={!!detailInvoice} onClose={() => setDetailInvoice(null)} />
    </div>
  );
}
