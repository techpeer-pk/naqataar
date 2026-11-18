import { useState, useEffect, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
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
import { reservationRef } from '../../utils/format';
import { formatCurrency } from '../../utils/chartPalette';
import OpsDataTable, { escapeHtml } from '../../components/oprations/OpsDataTable';
import ReservationDetailModal from '../../components/shared/ReservationDetailModal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const STATUSES = [null, 'pending', 'confirmed', 'completed', 'cancelled'];
const STATUS_LABELS = { null: 'All', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

// Hotel + Nayasaa, read for every tier; status changes managerOps (or
// SuperAdmin) only — see docs/Operations-Console.md.
export default function OpsReservationsPage() {
  const { user, userProfile, isOpsOperational, isSuperAdmin } = useAuth();
  const canAct = isOpsOperational || isSuperAdmin;

  // pageSize: 'all' — fetch the whole collection once; DataTables' own
  // length-menu/pagination is what actually pages through it from here.
  const { rows, setRows, loading, reload } = usePaginatedCollection('reservations', { mode: 'page', pageSize: 'all' });
  const { updateStatus } = useReservations();
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
        // Atomic: flips status to cancelled and releases the held
        // room-nights — a plain updateStatus would leave capacity stuck.
        await cancelReservation(resv, { role: isSuperAdmin ? 'superadmin' : 'ops', uid: user?.uid, name: userProfile?.displayName || user?.displayName, reason });
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

  const displayed = useMemo(() => {
    let list = filterBySearch(rows, search, ['customerName', 'businessName', 'customerEmail']);
    list = list.filter(r => filter === null || r.status === filter);
    list = list.filter(r => !dateFilter || (r.checkIn <= dateFilter && dateFilter < r.checkOut));
    return list;
  }, [rows, search, filter, dateFilter]);

  const columns = useMemo(() => [
    { title: 'Booking ID', value: r => r.reservationRef || reservationRef(r.id) },
    { title: 'Business', value: r => r.businessName },
    { title: 'Customer', value: r => r.customerName,
      html: r => `${escapeHtml(r.customerName)}<span class="dt-sub">${escapeHtml(r.customerPhone)}</span><span class="dt-sub">${escapeHtml(r.customerEmail)}</span>` },
    // type: 'string' stops DataTables auto-detecting this as a date column —
    // that path needs the DateTime library (not loaded) and crashes
    // SearchBuilder instead of rendering a condition for it.
    { title: 'Check-in → Check-out', value: r => `${r.checkIn} ${r.checkOut}`, html: r => `${escapeHtml(r.checkIn)} → ${escapeHtml(r.checkOut)}<span class="dt-sub">${escapeHtml(r.nights)} night(s)</span>`, type: 'string' },
    { title: 'Room/Outfit', value: r => r.roomTypeName || '—', visible: false },
    { title: 'Rooms/Qty', value: r => r.roomsRequested ?? '—' },
    { title: 'Guests', value: r => r.guestCount ?? '—', visible: false },
    // Financial — pricePerNight × nights ≈ totalPrice; priceFlag (already in
    // the Status badge) marks a client-submitted price that didn't match the
    // server-side recalculation. See CLAUDE.md's "Integrity-critical logic".
    { title: 'Price / Night', value: r => r.pricePerNight != null ? formatCurrency(r.pricePerNight) : '—', visible: false },
    { title: 'Total Price', value: r => r.totalPrice != null ? formatCurrency(r.totalPrice) : '—' },
    { title: 'Status', value: r => STATUS_LABELS[r.status] || r.status,
      html: r => `<span class="badge badge-${escapeHtml(r.status)}">${escapeHtml(STATUS_LABELS[r.status] || r.status)}</span>${r.priceFlag ? ' <span class="badge badge-price-flag" title="Price mismatch detected">Price</span>' : ''}` },
    { title: 'Notes', value: r => r.notes || '—', visible: false },
    { title: 'Created', value: r => r.createdAt?.toMillis?.() || r.createdAt?.seconds || 0,
      html: r => r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : '—', visible: false },
  ], []);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Reservations</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Hotel + Nayasaa, across every business — {rows.length} total.</p>
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
          <OpsDataTable columns={columns} rows={displayed} emptyMessage="No reservations found." onRowClick={setDetailReservation} exportFilename="reservations" />
        </div>
      )}

      <ReservationDetailModal
        reservation={detailReservation}
        open={!!detailReservation}
        onClose={() => setDetailReservation(null)}
        actionLoading={actionLoading}
        onAction={handleAction}
        canAct={canAct}
        canDelete={false}
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
