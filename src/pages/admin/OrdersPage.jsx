import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X, Search, UtensilsCrossed, Store, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CancelReasonDialog from '../../components/shared/CancelReasonDialog';
import { BUSINESS_ORDER_CANCEL_REASONS } from '../../utils/cancelReasons';
import { useOrders } from '../../hooks/useOrders';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { useOwnBusiness } from '../../hooks/useOwnBusiness';
import { useAuth } from '../../context/AuthContext';
import { filterBySearch } from '../../utils/search';
import { orderRef, bookingRef } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import Sk from '../../components/shared/Skeleton';
import PaymentProofLink from '../../components/shared/PaymentProofLink';
import OrderDetailModal from '../../components/shared/OrderDetailModal';
import { STATUSES, STATUS_LABELS, CANCELLABLE, nextActionsFor } from '../eatsadmin/OrdersPage';
import './AppointmentsPage.css';
import '../public/eats/MyOrdersPage.css';   // badge-preparing / badge-out_for_delivery / badge-dinein

// F2 owner console: the vendor runs their own order lifecycle, scoped to
// their business. Same status flow as the Ops console (config imported from
// it); differences: no audit log (owners may not write the trail — rules),
// no hard delete, no FoodVend column.
export default function AdminOrdersPage() {
  const { user, userProfile } = useAuth();
  const { business, loading: bizLoading } = useOwnBusiness();
  const { orders, loading, fetchByBusiness, updateStatus } = useOrders();
  const { sendOrderStatusUpdate, sendOrderCancellation } = useEmailNotifications();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [searchParams] = useSearchParams();
  const targetOrderId = searchParams.get('order');
  const targetRowId = targetOrderId ? `order-row-${targetOrderId}` : undefined;

  useEffect(() => {
    if (business?.id && business.offersOrdering === true) fetchByBusiness(business.id);
  }, [business, fetchByBusiness]);

  // Deep link from /admin/appointments — jump straight to the matching row
  // instead of dropping the admin at the top of a long table.
  useEffect(() => {
    if (!targetRowId || loading) return;
    const el = document.getElementById(targetRowId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetRowId, loading, orders.length]);

  const [cancelTarget, setCancelTarget] = useState(null);

  const handleAction = async (order, status, reason) => {
    // if (status === 'cancelled' && !window.confirm('Cancel this order? This action is recorded against your account.')) return;
    // Cancel goes through CancelReasonDialog first (reason required); the
    // dialog calls back here with the reason filled in.
    if (status === 'cancelled' && reason === undefined) { setCancelTarget(order); return; }
    setActionLoading(order.id + status);
    try {
      await updateStatus(order.id, status, status === 'cancelled' ? { role: 'business', uid: user?.uid, name: userProfile?.displayName || user?.displayName, reason } : undefined);
      if (status === 'cancelled') await sendOrderCancellation(order, reason);
      else await sendOrderStatusUpdate(order, STATUS_LABELS[status] || status);
      toast.success(`Order ${STATUS_LABELS[status] || status}.`);
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
      setCancelTarget(null);
    }
  };

  const displayed = useMemo(() => {
    let list = filterBySearch(orders, search, ['customerName', 'customerPhone', 'deliveryAddress']);
    return list.filter(o => filter === null || o.status === filter);
  }, [orders, search, filter]);

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
    { key: 'customerName', header: 'Customer', sortable: true, render: o => (
      <>
        <p className="customer-name">{o.customerName}</p>
        <p className="customer-contact">{o.customerPhone}</p>
        {o.fulfillmentType === 'dine_in' ? (
          <p className="customer-contact">
            <Link to={`/admin/appointments?appt=${o.appointmentId}`} className="booking-chip">
              Booking {bookingRef(o.appointmentId)}
            </Link>
            {o.scheduledFor?.toDate ? ` · ${o.scheduledFor.toDate().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
          </p>
        ) : o.fulfillmentType === 'pickup' ? (
          <p className="customer-contact">Self pickup</p>
        ) : (
          <p className="customer-contact">{o.deliveryAddress}</p>
        )}
      </>
    ) },
    { key: 'items', header: 'Items', render: o => (
      <span className="order-row-items-preview">
        {(o.items || []).length} item{(o.items || []).length === 1 ? '' : 's'} — click to view
      </span>
    ) },
    { key: 'totalAmount', header: 'Total', sortable: true, sortValue: o => o.totalAmount || 0,
      render: o => (
        <>
          {`PKR ${Number(o.totalAmount || 0).toLocaleString()}`}
          {o.priceFlag && (
            <span className={`badge badge-price-flag ${o.status !== 'cancelled' ? 'badge-price-flag-blink' : ''}`} style={{ marginLeft: '0.4rem' }} title={o.priceFlagReason || 'Price mismatch detected'}>
              <AlertTriangle size={12} /> Price
            </span>
          )}
        </>
      ) },
    { key: 'paymentProof', header: 'Payment Proof', stopRowClick: true, render: o => <PaymentProofLink url={o.paymentProofUrl} /> },
    { key: 'status', header: 'Status', sortable: true, render: o => (
      <span className={`badge badge-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
    ) },
    { key: 'actions', header: 'Actions', stopRowClick: true, render: o => (
      <div className="action-btns">
        {nextActionsFor(o).map(({ status, icon: Icon, title, cls }) => (
          <button key={status} className={`btn btn-sm ${cls}`} disabled={actionLoading === o.id + status}
            onClick={() => handleAction(o, status)} title={actionLoading === o.id + status ? 'Please wait…' : title}>
            {actionLoading === o.id + status ? <Loader2 size={14} className="icon-spin" /> : <Icon size={14} />}
          </button>
        ))}
        {CANCELLABLE.includes(o.status) && (
          <button className="btn btn-danger btn-sm" disabled={actionLoading === o.id + 'cancelled'}
            onClick={() => handleAction(o, 'cancelled')} title={actionLoading === o.id + 'cancelled' ? 'Please wait…' : 'Cancel'}>
            {actionLoading === o.id + 'cancelled' ? <Loader2 size={14} className="icon-spin" /> : <X size={14} />}
          </button>
        )}
      </div>
    ) },
  ];

  if (bizLoading) {
    return (
      <div className="admin-layout page">
        <div className="container">
          <Sk w="220px" h="2rem" mb="1rem" />
          {Array.from({ length: 4 }).map((_, i) => <Sk key={i} h="52px" r="10px" mb="0.75rem" />)}
        </div>
      </div>
    );
  }

  if (!business || business.offersOrdering !== true) {
    return (
      <div className="admin-layout page">
        <div className="container">
          <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <UtensilsCrossed size={40} />
            <p>Food ordering is not enabled for your business.</p>
            <p style={{ fontSize: '0.85rem' }}>Contact the Qunjee team to join QunjeeEats.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>Orders</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Incoming food orders for {business.name} — {orders.length} loaded.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchByBusiness(business.id)} disabled={loading}>Refresh</button>
        </div>

        <div className="appt-filters card">
          <div className="card-body appt-filters-inner">
            <div className="status-filter-tabs">
              {STATUSES.map(s => (
                <button key={String(s)} className={`status-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                  {STATUS_LABELS[s]}
                  {s !== null && <span className="status-count">{orders.filter(o => o.status === s).length}</span>}
                </button>
              ))}
            </div>
            <div className="input-icon-wrap" style={{ maxWidth: '220px' }}>
              <Search size={16} className="input-icon" />
              <input className="form-control input-with-icon" placeholder="Customer, phone, address…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {Array.from({ length: 4 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <DataTable
              columns={columns}
              rows={displayed}
              emptyMessage="No orders yet."
              getRowId={o => `order-row-${o.id}`}
              highlightRowId={targetRowId}
              onRowClick={setDetailOrder}
            />
          </div>
        )}
      </div>

      <OrderDetailModal order={detailOrder} open={!!detailOrder} onClose={() => setDetailOrder(null)} />

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
