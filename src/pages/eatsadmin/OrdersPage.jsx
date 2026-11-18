import { useEffect, useState, useMemo } from 'react';
import { Check, CheckCircle, Bike, Flame, Search, Filter, Phone, UtensilsCrossed, Store, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import CancelReasonDialog from '../../components/shared/CancelReasonDialog';
import { BUSINESS_ORDER_CANCEL_REASONS } from '../../utils/cancelReasons';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useOrders } from '../../hooks/useOrders';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { useAuditLog } from '../../hooks/useAuditLog';
import { useAuth } from '../../context/AuthContext';
import { filterBySearch } from '../../utils/search';
import { orderRef, bookingRef, formatDateTime } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import Sk from '../../components/shared/Skeleton';
import OrderDetailModal from '../../components/shared/OrderDetailModal';
import '../admin/AppointmentsPage.css';
import '../public/eats/MyOrdersPage.css';   // badge-preparing / badge-out_for_delivery

// Shared with the owner-managed vendor console (admin/OrdersPage, F2).
export const STATUSES = [null, 'pending', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
export const STATUS_LABELS = {
  null: 'All', pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'On the way', completed: 'Completed', cancelled: 'Cancelled',
};

// Ops workflow: call/WhatsApp the FoodVend, then advance the status here.
const NEXT_ACTIONS = {
  pending:          [{ status: 'confirmed',        icon: Check,       title: 'Confirm (Restaurant accepted)', cls: 'action-confirm' }],
  confirmed:        [{ status: 'preparing',        icon: Flame,       title: 'Preparing',                    cls: 'action-confirm' }],
  preparing:        [{ status: 'out_for_delivery', icon: Bike,        title: 'Out for delivery',             cls: 'action-confirm' }],
  out_for_delivery: [{ status: 'completed',        icon: CheckCircle, title: 'Delivered',                    cls: 'action-complete' }],
};
export const CANCELLABLE = ['pending', 'confirmed', 'preparing'];

// Dine-in pre-orders (F1) and self-pickup orders never go out for delivery —
// from preparing they complete directly (served at the table / collected at
// the counter).
export function nextActionsFor(o) {
  if ((o.fulfillmentType === 'dine_in' || o.fulfillmentType === 'pickup') && o.status === 'preparing') {
    return [{
      status: 'completed', icon: CheckCircle,
      title: o.fulfillmentType === 'dine_in' ? 'Served (dine-in)' : 'Picked up',
      cls: 'action-complete',
    }];
  }
  return NEXT_ACTIONS[o.status] || [];
}

// Shared by both consoles: /eatsadmin/orders (Ops) and /superadmin/orders
// (Directors — superadmin/OrdersPage.jsx re-exports this). Hard delete is
// superAdmin-only, matching the firestore rule.
export default function EatsAdminOrdersPage() {
  const { rows, setRows, loading, hasMore, loadMore, reload } = usePaginatedCollection('orders');
  const { updateStatus, remove } = useOrders();
  const { sendOrderStatusUpdate, sendOrderCancellation } = useEmailNotifications();
  const { log } = useAuditLog();
  const { user, userProfile, isSuperAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);

  useEffect(() => { reload(); }, [reload]);

  const [cancelTarget, setCancelTarget] = useState(null);

  const handleAction = async (order, status, reason) => {
    // if (status === 'cancelled' && !window.confirm('Cancel this order? This action is recorded against your account.')) return;
    // Cancel goes through CancelReasonDialog first (reason required); the
    // dialog calls back here with the reason filled in.
    if (status === 'cancelled' && reason === undefined) { setCancelTarget(order); return; }
    setActionLoading(order.id + status);
    try {
      const actor = status === 'cancelled'
        ? { role: isSuperAdmin ? 'superadmin' : 'eatsadmin', uid: user?.uid, name: userProfile?.displayName || user?.displayName, reason }
        : undefined;
      await updateStatus(order.id, status, actor);
      if (status === 'cancelled') await sendOrderCancellation(order, reason);
      else await sendOrderStatusUpdate(order, STATUS_LABELS[status] || status);
      await log({ action: 'update', targetCollection: 'orders', docId: order.id, summary: `${order.customerName} @ ${order.businessName}: status→${status}` });
      setRows(prev => prev.map(o => o.id === order.id ? { ...o, status } : o));
      toast.success(`Order ${STATUS_LABELS[status] || status}.`);
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
      setCancelTarget(null);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Permanently delete this order (${order.customerName})? This cannot be undone.`)) return;
    setActionLoading(order.id + 'delete');
    try {
      await remove(order.id);
      await log({ action: 'delete', targetCollection: 'orders', docId: order.id, summary: `${order.customerName} @ ${order.businessName}` });
      setRows(prev => prev.filter(o => o.id !== order.id));
      toast.success('Order deleted.');
    } catch {
      toast.error('Delete failed.');
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

  const columns = [
    { key: 'ref', header: 'Order ID', sortable: true, sortValue: o => orderRef(o.id),
      render: o => (
        <>
          <span className="booking-ref-cell">{orderRef(o.id)}</span>
          {o.fulfillmentType === 'dine_in' && (
            <span className="badge badge-dinein"><UtensilsCrossed size={11} /> Dine-in</span>
          )}
          {o.fulfillmentType === 'pickup' && (
            <span className="badge badge-pickup"><Store size={11} /> Pickup</span>
          )}
        </>
      ) },
    { key: 'businessName', header: 'Restaurant', sortable: true, render: o => (
      <>
        <p className="customer-name">{o.businessName}</p>
        {o.businessPhone && (
          <p className="customer-contact"><Phone size={11} /> <a href={`tel:${o.businessPhone}`}>{o.businessPhone}</a></p>
        )}
      </>
    ) },
    { key: 'customerName', header: 'Customer', sortable: true, render: o => (
      <>
        <p className="customer-name">{o.customerName}</p>
        <p className="customer-contact">{o.customerPhone}</p>
        {o.fulfillmentType === 'dine_in' ? (
          <p className="customer-contact">
            Booking {bookingRef(o.appointmentId)}
            {o.scheduledFor?.toDate ? ` · ${o.scheduledFor.toDate().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
          </p>
        ) : o.fulfillmentType === 'pickup' ? (
          <p className="customer-contact">Self pickup</p>
        ) : (
          <p className="customer-contact">{o.deliveryAddress}</p>
        )}
      </>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: o => (
      <>
        <span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
        {o.priceFlag && (
          <span className={`badge badge-price-flag ${o.status !== 'cancelled' ? 'badge-price-flag-blink' : ''}`} style={{ marginLeft: '0.4rem' }} title={o.priceFlagReason || 'Price mismatch detected'}>
            <AlertTriangle size={12} /> Price
          </span>
        )}
      </>
    ) },
    { key: 'updatedAt', header: 'Updated At', sortable: true,
      sortValue: o => {
        const ts = o.updatedAt;
        return ts ? (typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0) : 0;
      },
      render: o => (
        o.updatedAt
          ? <span style={{ whiteSpace: 'nowrap' }}>{formatDateTime(o.updatedAt)}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
      ) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Orders</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            When a new order arrives, call/WhatsApp the restaurant, then update the status here — {rows.length} loaded{hasMore ? '+' : ''}.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={reload} disabled={loading}>Refresh</button>
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
          <DataTable columns={columns} rows={displayed} emptyMessage="No orders yet." onRowClick={setDetailOrder} />
        </div>
      )}

      {hasMore && (
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }} disabled={loading} onClick={loadMore}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      <OrderDetailModal
        order={detailOrder}
        open={!!detailOrder}
        onClose={() => setDetailOrder(null)}
        actionLoading={actionLoading}
        onAction={handleAction}
        onDelete={handleDelete}
        canDelete={isSuperAdmin}
      />

      <CancelReasonDialog
        open={!!cancelTarget}
        title="Cancel Order"
        message="This action is recorded against your account and can't be undone."
        presets={BUSINESS_ORDER_CANCEL_REASONS}
        required
        loading={!!cancelTarget && actionLoading === cancelTarget.id + 'cancelled'}
        onConfirm={reason => handleAction(cancelTarget, 'cancelled', reason)}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
