import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Filter, Search, Plus, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../hooks/useAppointments';
import { useBusinesses } from '../../hooks/useBusinesses';
import { usePaginatedCollection } from '../../hooks/usePaginatedCollection';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { useBooking, SlotUnavailableError } from '../../hooks/useBooking';
import { useSlots } from '../../hooks/useSlots';
import { useServices } from '../../hooks/useServices';
import { useAuditLog } from '../../hooks/useAuditLog';
import { filterBySearch } from '../../utils/search';
import { bookingRef, formatTime12h, formatDateTime } from '../../utils/format';
import DataTable from '../../components/superadmin/DataTable';
import Modal from '../../components/superadmin/Modal';
import AppointmentDetailModal from '../../components/shared/AppointmentDetailModal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const STATUSES = [null, 'pending', 'confirmed', 'completed', 'no_show', 'cancelled'];
const STATUS_LABELS = { null: 'All', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', no_show: 'No-Show', cancelled: 'Cancelled' };
const EMPTY_BOOKING = { businessId: '', serviceId: '', date: '', time: '', name: '', phone: '', email: '', notes: '' };

export default function SuperAdminAppointmentsPage() {
  const { user, userProfile } = useAuth();
  const { rows, setRows, loading, hasMore, loadMore, reload } = usePaginatedCollection('appointments');
  const { updateStatus, remove } = useAppointments();
  const { fetchOne: fetchBusiness } = useBusinesses();
  const { sendAdminConfirmed, sendCancellation } = useEmailNotifications();
  const { bookAppointment, cancelAppointment } = useBooking();
  const { log } = useAuditLog();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [detailAppt, setDetailAppt] = useState(null);

  // Manual booking (create)
  const [showCreate, setShowCreate] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [booking, setBooking] = useState(EMPTY_BOOKING);
  const [bookingSaving, setBookingSaving] = useState(false);
  const business = businesses.find(b => b.id === booking.businessId) || null;
  const { services, fetchAll: fetchServices } = useServices(booking.businessId);
  const service = services.find(s => s.id === booking.serviceId) || null;
  const { slots: availableTimes, loading: slotsLoading, fetchSlots } = useSlots();

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!showCreate || businesses.length) return;
    getDocs(collection(db, 'businesses')).then(snap => setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [showCreate]);

  useEffect(() => {
    if (booking.businessId) fetchServices();
  }, [booking.businessId]);

  useEffect(() => {
    if (business && booking.date) {
      const [y, m, d] = booking.date.split('-').map(Number);
      fetchSlots(business, new Date(y, m - 1, d), service);
    }
  }, [business, booking.date, service]);

  const closeCreate = () => { setShowCreate(false); setBooking(EMPTY_BOOKING); setBusinesses([]); };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!business || !service) { toast.error('Pick a business and service.'); return; }
    setBookingSaving(true);
    try {
      const apptId = await bookAppointment({
        business, services: [service], dateStr: booking.date, time: booking.time,
        customer: { name: booking.name.trim(), phone: booking.phone.trim(), email: booking.email.trim(), notes: booking.notes.trim() },
      });
      await log({ action: 'create', targetCollection: 'appointments', docId: apptId, summary: `${booking.name} @ ${business.name} (${booking.date} ${booking.time})` });
      toast.success('Appointment created.');
      closeCreate();
      reload();
    } catch (err) {
      toast.error(err instanceof SlotUnavailableError ? err.message : 'Could not create appointment.');
    } finally {
      setBookingSaving(false);
    }
  };

  // `reason` comes from AppointmentDetailModal's cancel step (required there).
  const handleAction = async (appt, status, reason) => {
    // AppointmentDetailModal already makes the admin type "cancel" before
    // calling onAction — no extra window.confirm needed here.
    // if (status === 'cancelled' && !window.confirm('Cancel this appointment? This action is recorded against your account.')) return;
    setActionLoading(appt.id + status);
    try {
      if (status === 'cancelled') {
        await cancelAppointment(appt, { role: 'superadmin', uid: user?.uid, name: userProfile?.displayName || user?.displayName, reason });
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

  const handleDelete = async (appt) => {
    if (!confirm(`Permanently delete this appointment (${appt.customerName})? This cannot be undone.`)) return;
    setActionLoading(appt.id + 'delete');
    try {
      await remove(appt.id);
      await log({ action: 'delete', targetCollection: 'appointments', docId: appt.id, summary: `${appt.customerName} @ ${appt.businessName}` });
      setRows(prev => prev.filter(a => a.id !== appt.id));
      setDetailAppt(null);
      toast.success('Appointment deleted.');
    } catch {
      toast.error('Delete failed.');
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

  const columns = [
    { key: 'bookingRef', header: 'Booking ID', sortable: true, sortValue: a => a.bookingRef || bookingRef(a.id),
      render: a => <span className="booking-ref-cell">{a.bookingRef || bookingRef(a.id)}</span> },
    { key: 'businessName', header: 'Business', sortable: true, render: a => a.businessName },
    { key: 'customerName', header: 'Customer', sortable: true, render: a => (
      <>
        <p className="customer-name">{a.customerName}</p>
        <p className="customer-contact">{a.customerPhone}</p>
        <p className="customer-contact">{a.customerEmail}</p>
      </>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: a => (
      <>
        <span className={`badge badge-${a.status}`}>{STATUS_LABELS[a.status] || a.status}</span>
        {a.priceFlag && (
          <span className={`badge badge-price-flag ${a.status !== 'cancelled' ? 'badge-price-flag-blink' : ''}`} style={{ marginLeft: '0.4rem' }} title={a.priceFlagReason || 'Price mismatch detected'}>
            <AlertTriangle size={12} /> Price
          </span>
        )}
      </>
    ) },
    { key: 'updatedAt', header: 'Updated At', sortable: true,
      sortValue: a => {
        const ts = a.updatedAt;
        return ts ? (typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0) : 0;
      },
      render: a => (
        a.updatedAt
          ? <span style={{ whiteSpace: 'nowrap' }}>{formatDateTime(a.updatedAt)}</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
      ) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Appointments</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Across every business — {rows.length} loaded{hasMore ? '+' : ''}.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} title="Add Appointment"><Plus size={16} /></button>
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
          <DataTable columns={columns} rows={displayed} emptyMessage="No appointments found." onRowClick={setDetailAppt} />
        </div>
      )}

      {hasMore && (
        <button className="btn btn-ghost" style={{ marginTop: '1rem' }} disabled={loading} onClick={loadMore}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}

      <Modal open={showCreate} onClose={closeCreate} title="Add Appointment">
        <form onSubmit={handleCreateBooking}>
          <div className="form-group">
            <label className="form-label">Business *</label>
            <select className="form-control" value={booking.businessId} required
              onChange={e => setBooking(b => ({ ...b, businessId: e.target.value, serviceId: '', date: '', time: '' }))}>
              <option value="" disabled>Select a business…</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Service *</label>
            <select className="form-control" value={booking.serviceId} required disabled={!booking.businessId}
              onChange={e => setBooking(b => ({ ...b, serviceId: e.target.value, date: '', time: '' }))}>
              <option value="" disabled>Select a service…</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration} min)</option>)}
            </select>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="form-control" value={booking.date} required disabled={!booking.serviceId}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setBooking(b => ({ ...b, date: e.target.value, time: '' }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Time *</label>
              <select className="form-control" value={booking.time} required disabled={!booking.date || slotsLoading}
                onChange={e => setBooking(b => ({ ...b, time: e.target.value }))}>
                <option value="" disabled>{slotsLoading ? 'Loading…' : 'Select a time…'}</option>
                {availableTimes.map(t => <option key={t} value={t}>{formatTime12h(t)}</option>)}
              </select>
            </div>
          </div>
          {booking.date && !slotsLoading && availableTimes.length === 0 && (
            <p className="form-hint" style={{ color: '#DC2626' }}>No open slots for this business/service on this date.</p>
          )}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input className="form-control" value={booking.name} required
                onChange={e => setBooking(b => ({ ...b, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-control" type="tel" value={booking.phone} required
                onChange={e => setBooking(b => ({ ...b, phone: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-control" type="email" value={booking.email} required
              onChange={e => setBooking(b => ({ ...b, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-control" value={booking.notes}
              onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={closeCreate}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={bookingSaving || !booking.time} title="Create Appointment">
              <Save size={16} />
            </button>
          </div>
        </form>
      </Modal>

      <AppointmentDetailModal
        appointment={detailAppt}
        open={!!detailAppt}
        onClose={() => setDetailAppt(null)}
        actionLoading={actionLoading}
        onAction={handleAction}
        onDelete={handleDelete}
      />
    </div>
  );
}
