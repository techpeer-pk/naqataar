import { useState, useEffect, useMemo } from 'react';
import { Filter, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import CancelReasonDialog from '../../components/shared/CancelReasonDialog';
import { BUSINESS_BOOKING_CANCEL_REASONS } from '../../utils/cancelReasons';
import { useAuth } from '../../context/AuthContext';
import { useReservations } from '../../hooks/useReservations';
import { useRoomBooking } from '../../hooks/useRoomBooking';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { useAuditLog } from '../../hooks/useAuditLog';
import { filterBySearch } from '../../utils/search';
import { reservationRef, formatDateTime } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import ReservationDetailModal from '../../components/shared/ReservationDetailModal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const STATUSES = [null, 'pending', 'confirmed', 'completed', 'cancelled'];
const STATUS_LABELS = { null: 'All', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

export default function ReservationsPage() {
  const { user, userProfile } = useAuth();
  const { rows, setRows, loading, hasMore, loadMore, reload } = usePaginatedCollection('reservations');
  const { updateStatus, remove } = useReservations();
  const { cancelReservation } = useRoomBooking();
  const { sendReservationConfirmed } = useEmailNotifications();
  const { log } = useAuditLog();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [detailReservation, setDetailReservation] = useState(null);

  useEffect(() => { reload(); }, [reload]);

  const [cancelTarget, setCancelTarget] = useState(null);

  const handleAction = async (resv, status, reason) => {
    // if (status === 'cancelled' && !window.confirm('Cancel this reservation? This action is recorded against your account.')) return;
    // Cancel goes through CancelReasonDialog first (reason required); the
    // dialog calls back here with the reason filled in.
    if (status === 'cancelled' && reason === undefined) { setCancelTarget(resv); return; }
    setActionLoading(resv.id + status);
    try {
      if (status === 'cancelled') {
        // Atomic: flips status to cancelled and releases the held room-nights
        // (same helper the business-admin RoomsPage uses) — a plain
        // updateStatus would leave capacity stuck as booked forever.
        await cancelReservation(resv, { role: 'superadmin', uid: user?.uid, name: userProfile?.displayName || user?.displayName, reason });
      } else {
        await updateStatus(resv.id, status);
        if (status === 'confirmed') await sendReservationConfirmed(resv);
      }
      await log({ action: 'update', targetCollection: 'reservations', docId: resv.id, summary: `${resv.customerName}: status→${status}` });
      setRows(prev => prev.map(r => r.id === resv.id ? { ...r, status } : r));
      setDetailReservation(prev => prev && prev.id === resv.id ? { ...prev, status } : prev);
      toast.success(`Reservation ${status}.`);
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
      setCancelTarget(null);
    }
  };

  const handleDelete = async (resv) => {
    if (!confirm(`Permanently delete this reservation (${resv.customerName})? This cannot be undone.`)) return;
    setActionLoading(resv.id + 'delete');
    try {
      await remove(resv.id);
      await log({ action: 'delete', targetCollection: 'reservations', docId: resv.id, summary: `${resv.customerName} @ ${resv.businessName}` });
      setRows(prev => prev.filter(r => r.id !== resv.id));
      setDetailReservation(null);
      toast.success('Reservation deleted.');
    } catch {
      toast.error('Delete failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const displayed = useMemo(() => {
    let list = filterBySearch(rows, search, ['customerName', 'businessName', 'customerEmail']);
    list = list.filter(r => filter === null || r.status === filter);
    list = list.filter(r => !dateFilter || (r.checkIn <= dateFilter && dateFilter < r.checkOut));
    return list;
  }, [rows, search, filter, dateFilter]);

  const columns = [
    { key: 'reservationRef', header: 'Booking ID', sortable: true, sortValue: r => r.reservationRef || reservationRef(r.id),
      render: r => <span className="booking-ref-cell">{r.reservationRef || reservationRef(r.id)}</span> },
    { key: 'businessName', header: 'Business', sortable: true, render: r => r.businessName },
    { key: 'customerName', header: 'Customer', sortable: true, render: r => (
      <>
        <p className="customer-name">{r.customerName}</p>
        <p className="customer-contact">{r.customerPhone}</p>
        <p className="customer-contact">{r.customerEmail}</p>
      </>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: r => (
      <>
        <span className={`badge badge-${r.status}`}>{r.status}</span>
        {r.priceFlag && (
          <span className={`badge badge-price-flag ${r.status !== 'cancelled' ? 'badge-price-flag-blink' : ''}`} style={{ marginLeft: '0.4rem' }} title={r.priceFlagReason || 'Price mismatch detected'}>
            <AlertTriangle size={12} /> Price
          </span>
        )}
      </>
    ) },
    { key: 'updatedAt', header: 'Updated At', sortable: true,
      sortValue: r => {
        const ts = r.updatedAt;
        return ts ? (typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0) : 0;
      },
      render: r => (
        r.updatedAt
          ? <span style={{ whiteSpace: 'nowrap' }}>{formatDateTime(r.updatedAt)}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
      ) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Reservations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hotel + Nayasaa, across every business — {rows.length} loaded{hasMore ? '+' : ''}.</p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="status-filter-tabs">
            {STATUSES.map(s => (
              <button key={String(s)} className={`status-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {STATUS_LABELS[s]}
                {s !== null && <span className="status-count">{rows.filter(r => r.status === s).length}</span>}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="input-icon-wrap" style={{ maxWidth: '220px' }}>
              <Search size={16} className="input-icon" />
              <input className="form-control input-with-icon" placeholder="Customer or business…"
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
          <DataTable columns={columns} rows={displayed} emptyMessage="No reservations found." onRowClick={setDetailReservation} />
        </div>
      )}

      {hasMore && (
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }} disabled={loading} onClick={loadMore}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      <ReservationDetailModal
        reservation={detailReservation}
        open={!!detailReservation}
        onClose={() => setDetailReservation(null)}
        actionLoading={actionLoading}
        onAction={handleAction}
        onDelete={handleDelete}
      />

      <CancelReasonDialog
        open={!!cancelTarget}
        title="Cancel Reservation"
        message="This action is recorded against your account and can't be undone."
        presets={BUSINESS_BOOKING_CANCEL_REASONS}
        required
        loading={!!cancelTarget && actionLoading === cancelTarget.id + 'cancelled'}
        onConfirm={reason => handleAction(cancelTarget, 'cancelled', reason)}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}
