import { useState, useEffect, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../hooks/useAppointments';
import { useBusinesses } from '../../hooks/useBusinesses';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { useBooking } from '../../hooks/useBooking';
import { useAuditLog } from '../../hooks/useAuditLog';
import { filterBySearch } from '../../utils/search';
import { bookingRef, formatTime12h } from '../../utils/format';
import { formatCurrency } from '../../utils/chartPalette';
import OpsDataTable, { escapeHtml } from '../../components/oprations/OpsDataTable';
import AppointmentDetailModal from '../../components/shared/AppointmentDetailModal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const STATUSES = [null, 'pending', 'confirmed', 'completed', 'no_show', 'cancelled'];
const STATUS_LABELS = { null: 'All', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', no_show: 'No-Show', cancelled: 'Cancelled' };

// Read for every tier; status changes are managerOps (or SuperAdmin)
// only — see docs/Operations-Console.md. No create/delete here: those stay
// in /superadmin, this console is monitoring + status changes only.
export default function OpsAppointmentsPage() {
  const { user, userProfile, isOpsOperational, isSuperAdmin } = useAuth();
  const canAct = isOpsOperational || isSuperAdmin;

  // pageSize: 'all' — fetch the whole collection once; DataTables' own
  // length-menu/pagination is what actually pages through it from here.
  const { rows, setRows, loading, reload } = usePaginatedCollection('appointments', { mode: 'page', pageSize: 'all' });
  const { updateStatus } = useAppointments();
  const { fetchOne: fetchBusiness } = useBusinesses();
  const { sendAdminConfirmed, sendCancellation } = useEmailNotifications();
  const { cancelAppointment } = useBooking();
  const { log } = useAuditLog();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [detailAppt, setDetailAppt] = useState(null);

  useEffect(() => { reload(); }, [reload]);

  // `reason` comes from AppointmentDetailModal's cancel step (required there).
  const handleAction = async (appt, status, reason) => {
    // AppointmentDetailModal already makes the admin type "cancel" before
    // calling onAction — no extra window.confirm needed here.
    // if (status === 'cancelled' && !window.confirm('Cancel this appointment? This action is recorded against your account.')) return;
    setActionLoading(appt.id + status);
    try {
      if (status === 'cancelled') {
        await cancelAppointment(appt, { role: isSuperAdmin ? 'superadmin' : 'ops', uid: user?.uid, name: userProfile?.displayName || user?.displayName, reason });
        await log({ action: 'update', targetCollection: 'appointments', docId: appt.id, summary: `Cancelled appointment ${bookingRef(appt.id)}` });
        await sendCancellation(appt, reason);
      } else {
        await updateStatus(appt.id, status);
        if (status === 'confirmed') {
          // Bingo (2026-09-11): include the F1 dine-in pre-order link in the
          // "confirmed" email, only for hybrid restaurants that actually
          // offer it. Fetched fresh — offersOrdering isn't denormalized onto
          // the appointment and can change after the booking was made.
          const biz = await fetchBusiness(appt.businessId);
          const pfoUrl = biz?.offersOrdering === true
            ? `${window.location.origin}/pfo/${appt.businessId}?appt=${appt.id}`
            : null;
          await sendAdminConfirmed(appt, pfoUrl);
        }
      }
      await log({ action: 'update', targetCollection: 'appointments', docId: appt.id, summary: `${appt.customerName}: status→${status}` });
      setRows(prev => prev.map(a => a.id === appt.id ? { ...a, status } : a));
      setDetailAppt(prev => prev && prev.id === appt.id ? { ...prev, status } : prev);
      toast.success(`Appointment ${status}.`);
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const displayed = useMemo(() => {
    let list = filterBySearch(rows, search, ['customerName', 'businessName', 'customerEmail']);
    list = list.filter(a => filter === null || a.status === filter);
    list = list.filter(a => !dateFilter || a.date === dateFilter);
    return list;
  }, [rows, search, filter, dateFilter]);

  const columns = useMemo(() => [
    { title: 'Booking ID', value: a => a.bookingRef || bookingRef(a.id) },
    { title: 'Business', value: a => a.businessName },
    { title: 'Customer', value: a => a.customerName,
      html: a => `${escapeHtml(a.customerName)}<span class="dt-sub">${escapeHtml(a.customerPhone)}</span><span class="dt-sub">${escapeHtml(a.customerEmail)}</span>` },
    // type: 'string' stops DataTables auto-detecting this as a date column —
    // that path needs the DateTime library (not loaded) and crashes
    // SearchBuilder instead of rendering a condition for it.
    { title: 'Date & Time', value: a => `${a.date} ${a.time}`, html: a => `${escapeHtml(a.date)}<span class="dt-sub">${escapeHtml(formatTime12h(a.time))}</span>`, type: 'string' },
    { title: 'Service(s)', value: a => (a.services?.length ? a.services.map(s => s.name).join(', ') : a.serviceName) || '—' },
    // Financial — servicePrice is the booking's total; priceFlag (already in
    // the Status badge) marks a client-submitted price that didn't match the
    // server-side recalculation. See CLAUDE.md's "Integrity-critical logic".
    { title: 'Price', value: a => a.servicePrice != null ? formatCurrency(a.servicePrice) : '—' },
    { title: 'Status', value: a => STATUS_LABELS[a.status] || a.status,
      html: a => `<span class="badge badge-${escapeHtml(a.status)}">${escapeHtml(STATUS_LABELS[a.status] || a.status)}</span>${a.priceFlag ? ' <span class="badge badge-price-flag" title="Price mismatch detected">Price</span>' : ''}` },
    { title: 'Payment Proof', value: a => a.paymentProofUrl ? 'Yes' : 'No', visible: false },
    { title: 'Notes', value: a => a.notes || '—', visible: false },
    { title: 'Created', value: a => a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0,
      html: a => a.createdAt?.toDate ? a.createdAt.toDate().toLocaleDateString() : '—', visible: false },
  ], []);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Appointments</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Across every business — {rows.length} total.</p>
        </div>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="status-filter-tabs">
            {STATUSES.map(s => (
              <button key={String(s)} className={`status-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {STATUS_LABELS[s]}
                {s !== null && <span className="status-count">{rows.filter(a => a.status === s).length}</span>}
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
          <OpsDataTable columns={columns} rows={displayed} emptyMessage="No appointments found." onRowClick={setDetailAppt} exportFilename="appointments" />
        </div>
      )}

      <AppointmentDetailModal
        appointment={detailAppt}
        open={!!detailAppt}
        onClose={() => setDetailAppt(null)}
        actionLoading={actionLoading}
        onAction={handleAction}
        canAct={canAct}
        canDelete={false}
      />
    </div>
  );
}
