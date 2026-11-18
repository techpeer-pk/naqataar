import { useState, useEffect, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useOrders } from '../../hooks/useOrders';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { useAuditLog } from '../../hooks/useAuditLog';
import { filterBySearch } from '../../utils/search';
import { orderRef } from '../../utils/format';
import { formatCurrency } from '../../utils/chartPalette';
import { STATUSES, STATUS_LABELS } from '../eatsadmin/OrdersPage';
import OpsDataTable, { escapeHtml } from '../../components/oprations/OpsDataTable';
import OrderDetailModal from '../../components/shared/OrderDetailModal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';
import '../public/eats/MyOrdersPage.css';   // badge-preparing / badge-out_for_delivery

// QunjeeEats, read for every tier; status changes managerOps (or
// SuperAdmin) only — see docs/Operations-Console.md. Reuses the STATUSES/
// STATUS_LABELS the eatsadmin console already exports (pure constants, not
// UI — /eatsadmin itself stays untouched/hibernated) so the two consoles
// never drift on what a status means.
export default function OpsOrdersPage() {
  const { user, userProfile, isOpsOperational, isSuperAdmin } = useAuth();
  const canAct = isOpsOperational || isSuperAdmin;

  // pageSize: 'all' — fetch the whole collection once; DataTables' own
  // length-menu/pagination is what actually pages through it from here.
  const { rows, setRows, loading, reload } = usePaginatedCollection('orders', { mode: 'page', pageSize: 'all' });
  const { updateStatus } = useOrders();
  const { sendOrderStatusUpdate, sendOrderCancellation } = useEmailNotifications();
  const { log } = useAuditLog();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => { reload(); }, [reload]);

  const handleAction = async (order, status) => {
    if (status === 'cancelled' && !window.confirm('Cancel this order? This action is recorded against your account.')) return;
    setActionLoading(order.id + status);
    try {
      const actor = status === 'cancelled'
        ? { role: isSuperAdmin ? 'superadmin' : 'ops', uid: user?.uid, name: userProfile?.displayName || user?.displayName }
        : undefined;
      await updateStatus(order.id, status, actor);
      if (status === 'cancelled') await sendOrderCancellation(order);
      else await sendOrderStatusUpdate(order, STATUS_LABELS[status] || status);
      await log({ action: 'update', targetCollection: 'orders', docId: order.id, summary: `${order.customerName} @ ${order.businessName}: status→${status}` });
      setRows(prev => prev.map(o => o.id === order.id ? { ...o, status } : o));
      setDetailOrder(prev => prev && prev.id === order.id ? { ...prev, status } : prev);
      toast.success(`Order ${STATUS_LABELS[status] || status}.`);
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const displayed = useMemo(() => {
    let list = filterBySearch(rows, search, ['customerName', 'businessName', 'customerPhone', 'deliveryAddress']);
    list = list.filter(o => filter === null || o.status === filter);
    list = list.filter(o => {
      if (!dateFilter) return true;
      const created = o.createdAt?.toDate?.();
      return created && created.toISOString().slice(0, 10) === dateFilter;
    });
    return list;
  }, [rows, search, filter, dateFilter]);

  const columns = useMemo(() => [
    { title: 'Order ID', value: o => orderRef(o.id) },
    { title: 'Restaurant', value: o => o.businessName, html: o => escapeHtml(o.businessName) },
    { title: 'Customer', value: o => o.customerName,
      html: o => `${escapeHtml(o.customerName)}<span class="dt-sub">${escapeHtml(o.customerPhone)}</span>` },
    { title: 'Fulfillment', value: o => o.fulfillmentType,
      html: o => o.fulfillmentType === 'dine_in' ? 'Dine-in' : o.fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery' },
    { title: 'Delivery Address', value: o => o.deliveryAddress || '—', visible: false },
    { title: 'Items', value: o => (o.items || []).length,
      html: o => escapeHtml((o.items || []).map(i => `${i.name} x${i.quantity}`).join(', ') || '—') },
    // Financial — totalAmount is the order total; priceFlag (already in the
    // Status badge) marks a client-submitted price that didn't match the
    // server-side recalculation. See CLAUDE.md's "Integrity-critical logic".
    { title: 'Total Amount', value: o => o.totalAmount != null ? formatCurrency(o.totalAmount) : '—' },
    { title: 'Payment Method', value: o => o.paymentMethod === 'prepaid' ? 'Prepaid' : 'Cash on receipt', visible: false },
    { title: 'Status', value: o => STATUS_LABELS[o.status] || o.status,
      html: o => `<span class="badge badge-${escapeHtml(o.status)}">${escapeHtml(STATUS_LABELS[o.status] || o.status)}</span>${o.priceFlag ? ' <span class="badge badge-price-flag" title="Price mismatch detected">Price</span>' : ''}` },
    { title: 'Notes', value: o => o.notes || '—', visible: false },
    { title: 'Created', value: o => o.createdAt?.toMillis?.() || o.createdAt?.seconds || 0,
      html: o => o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString() : '—', visible: false },
  ], []);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Orders</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>QunjeeEats, across every vendor — {rows.length} total.</p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="status-filter-tabs">
            {STATUSES.map(s => (
              <button key={String(s)} className={`status-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {STATUS_LABELS[s]}
                {s !== null && <span className="status-count">{rows.filter(o => o.status === s).length}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="input-icon-wrap" style={{ maxWidth: '220px' }}>
              <Search size={16} className="input-icon" />
              <input className="form-control input-with-icon" placeholder="Customer, restaurant, address…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <input type="date" className="form-control" style={{ width: 'auto' }}
              value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            {dateFilter && <button className="btn btn-ghost btn-sm" onClick={() => setDateFilter('')}>Clear</button>}
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <OpsDataTable columns={columns} rows={displayed} emptyMessage="No orders yet." onRowClick={setDetailOrder} exportFilename="orders" />
        </div>
      )}

      <OrderDetailModal
        order={detailOrder}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        actionLoading={actionLoading}
        onAction={canAct ? handleAction : undefined}
        canDelete={false}
      />
    </div>
  );
}
