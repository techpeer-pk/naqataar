import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, UtensilsCrossed, AlertTriangle, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useAppointments } from '../../hooks/useAppointments';
import { useOrders } from '../../hooks/useOrders';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { useBooking } from '../../hooks/useBooking';
import { format } from 'date-fns';
import { bookingRef, orderRef, formatTime12h, formatDate } from '../../utils/format';
import { exportToCsv, exportToJson, exportToXlsx } from '../../utils/dataExport';
import Sk from '../../components/shared/Skeleton';
import PaymentProofLink from '../../components/shared/PaymentProofLink';
import DataTable from '../../components/superadmin/DataTable';
import AppointmentDetailModal from '../../components/shared/AppointmentDetailModal';
import './AppointmentsPage.css';
import { t } from '../../i18n';

const STATUSES = [null, 'pending', 'confirmed', 'completed', 'no_show', 'cancelled'];
const STATUS_LABELS = { null: 'All', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', no_show: 'No-Show', cancelled: 'Cancelled' };

// No-Show Policy, Scenario 1 (docs/Qunjee Eats - Pitch Deck.pdf): a
// confirmed booking can only be marked no-show once this grace window has
// passed since the reserved time — gives the customer a chance to still
// show up before the restaurant acts.
const NO_SHOW_GRACE_MINUTES = 15;

function pastGracePeriod(appt) {
  const dt = appt.appointmentDatetime?.toDate?.();
  return !!dt && (Date.now() - dt.getTime()) >= NO_SHOW_GRACE_MINUTES * 60 * 1000;
}

export default function AppointmentsPage() {
  const { user, userProfile } = useAuth();
  const { fetchByAdmin, fetchOne } = useBusinesses();
  const { appointments, loading, subscribeByBusiness, updateStatus } = useAppointments();
  const { orders, fetchByBusiness: fetchOrdersByBusiness } = useOrders();
  const { sendAdminConfirmed, sendCancellation } = useEmailNotifications();
  const { cancelAppointment, markNoShow } = useBooking();

  const [filter, setFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportType, setExportType] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [searchParams] = useSearchParams();
  const targetApptId = searchParams.get('appt');
  const [detailAppt, setDetailAppt] = useState(null);

  // pastGracePeriod() reads Date.now() at render time — with no data change,
  // React never re-renders on its own as wall-clock time passes, so the
  // No-Show button would only appear after some unrelated re-render (or a
  // manual refresh). This tick forces one every 30s purely so the grace
  // window shows up live, same spirit as useCountdown's setInterval.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Live — new bookings show up as they're made, no reload needed.
  useEffect(() => {
    let unsubscribe = null;
    let cancelled = false;
    const load = async () => {
      let biz = null;
      if (userProfile?.businessId) biz = await fetchOne(userProfile.businessId);
      else if (userProfile?.uid) biz = await fetchByAdmin(userProfile.uid);
      if (biz && !cancelled) {
        unsubscribe = subscribeByBusiness(biz.id);
        // So each booking row can point to its linked dine-in pre-order.
        fetchOrdersByBusiness(biz.id);
      }
    };
    if (userProfile) load();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [userProfile]);

  // Deep link from /admin/orders — jump straight to the matching row
  // instead of dropping the admin at the top of a long table.
  useEffect(() => {
    if (!targetApptId || loading) return;
    const el = document.getElementById(`appt-row-${targetApptId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetApptId, loading, appointments.length]);

  // `reason` comes from AppointmentDetailModal's cancel step (required there).
  const handleAction = async (appt, status, reason) => {
    setActionLoading(appt.id + status);
    try {
      if (status === 'cancelled') {
        // AppointmentDetailModal already makes the admin type "cancel"
        // before calling onAction — no extra window.confirm needed here.
        // if (!window.confirm('Cancel this appointment? This action is recorded against your account.')) {
        //   setActionLoading(null);
        //   return;
        // }
        // Atomic: flips status to cancelled and releases the held slot(s).
        // The live subscription picks up the status change — no manual refetch.
        await cancelAppointment(appt, { role: 'business', uid: user?.uid, name: userProfile?.displayName || user?.displayName, reason });
        await sendCancellation(appt, reason);
      } else if (status === 'no_show') {
        // Atomic: flips status to no_show and releases the held slot(s) —
        // see useBooking.markNoShow. Live subscription picks up the change.
        await markNoShow(appt);
      } else {
        await updateStatus(appt.id, status);
        if (status === 'confirmed') {
          // Bingo (2026-09-11): include the F1 dine-in pre-order link in the
          // "confirmed" email, only for hybrid restaurants that actually
          // offer it. Fetched fresh — offersOrdering isn't denormalized onto
          // the appointment and can change after the booking was made.
          const biz = await fetchOne(appt.businessId);
          const pfoUrl = biz?.offersOrdering === true
            ? `${window.location.origin}/pfo/${appt.businessId}?appt=${appt.id}`
            : null;
          await sendAdminConfirmed(appt, pfoUrl);
        }
      }
      // The live subscription updates `appointments`, but `detailAppt` is a
      // separate snapshot the popup holds — without this it'd keep showing
      // the old status and re-offer already-actioned buttons until closed.
      setDetailAppt(prev => prev && prev.id === appt.id ? { ...prev, status } : prev);
      toast.success(t('Appointment {status}.', { status: t(STATUS_LABELS[status] || status) }));
    } catch {
      toast.error(t('Action failed.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShow = (appt) => {
    if (window.confirm(`Mark ${appt.customerName}'s booking as a no-show? The table slot will be released${appt.paymentProofUrl ? ' — the booking fee is forfeited' : ''}.`)) {
      handleAction(appt, 'no_show');
    }
  };

  const displayed = appointments
    .filter(a => filter === null || a.status === filter)
    .filter(a => !dateFilter || a.date === dateFilter);

  const handleExport = async () => {
    // Starts from `displayed` so the status tab + quick date filter above
    // also constrain what gets exported, not just the export's own range.
    // That range is on Request Date (createdAt) — when the booking was
    // made — matching the "Request Date" column, not the appointment's own
    // `date`.
    const rows = displayed
      .filter(a => {
        const created = a.createdAt?.toDate?.();
        if (!created) return false;
        const day = format(created, 'yyyy-MM-dd');
        return (!exportFrom || day >= exportFrom) && (!exportTo || day <= exportTo);
      })
      .map(a => ({
        'Booking Ref': a.bookingRef || bookingRef(a.id),
        'Customer Name': a.customerName,
        'Customer Phone': a.customerPhone,
        'Customer Email': a.customerEmail,
        'Service': a.serviceName,
        'Appointment Date': a.date,
        'Time': a.time,
        'Status': a.status,
        'Price': a.servicePrice,
        'Request Date': a.createdAt?.toDate?.() || null,
      }));
    if (!rows.length) {
      toast.error(t('No appointments in that range.'));
      return;
    }
    const range = `${exportFrom || 'all'}_to_${exportTo || 'all'}`;
    const filename = `appointments_${range}.${exportType}`;
    setExporting(true);
    try {
      if (exportType === 'csv') exportToCsv(rows, filename);
      else if (exportType === 'json') exportToJson(rows, filename);
      else await exportToXlsx(rows, filename);
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: 'bookingRef', header: t('Booking ID'), sortable: true, stopRowClick: true,
      sortValue: a => a.bookingRef || bookingRef(a.id),
      render: a => {
        const linkedOrder = orders.find(o => o.appointmentId === a.id);
        return (
          <>
            <span className="booking-ref-cell">{a.bookingRef || bookingRef(a.id)}</span>
            {linkedOrder && (
              <Link to={`/admin/orders?order=${linkedOrder.id}`} className="linked-order-chip">
                <UtensilsCrossed size={11} /> {orderRef(linkedOrder.id)}
              </Link>
            )}
          </>
        );
      },
    },
    {
      key: 'createdAt', header: t('Request Date'), sortable: true,
      sortValue: a => a.createdAt?.toMillis?.() || 0,
      render: a => formatDate(a.createdAt) || '—',
    },
    { key: 'date', header: t('Booking Date'), sortable: true },
    { key: 'time', header: t('Booking Time'), sortable: true, render: a => formatTime12h(a.time) },
    { key: 'paymentProofUrl', header: t('Payment Proof'), stopRowClick: true, render: a => <PaymentProofLink url={a.paymentProofUrl} /> },
    {
      key: 'status', header: t('Status'), sortable: true,
      render: a => (
        <>
          <span className={`badge badge-${a.status}`}>{t(STATUS_LABELS[a.status] || a.status)}</span>
          {a.priceFlag && (
            <span className={`badge badge-price-flag ${a.status !== 'cancelled' ? 'badge-price-flag-blink' : ''}`} style={{ marginLeft: '0.4rem' }} title={a.priceFlagReason || 'Price mismatch detected'}>
              <AlertTriangle size={12} /> {t('Price')}
            </span>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="admin-layout page">
      <div className="container">
        <h1 style={{ marginBottom: '1.5rem' }}>{t('Appointments')}</h1>

        {/* Filters */}
        <div className="appt-filters card">
          <div className="card-body appt-filters-inner">
            <div className="status-filter-tabs">
              {STATUSES.map(s => (
                <button key={String(s)} className={`status-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                  {t(STATUS_LABELS[s])}
                  {s !== null && (
                    <span className="status-count">
                      {appointments.filter(a => a.status === s).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <input type="date" className="form-control" style={{ width: 'auto' }}
                value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
              {dateFilter && <button className="btn btn-ghost btn-sm" onClick={() => setDateFilter('')}>{t('Clear')}</button>}
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="appt-filters card" style={{ marginTop: '0.75rem' }}>
          <div className="card-body appt-filters-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Download size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('By Request Date:')}</span>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('From')}</label>
              <input type="date" className="form-control" style={{ width: 'auto' }}
                value={exportFrom} onChange={e => setExportFrom(e.target.value)} />
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('To')}</label>
              <input type="date" className="form-control" style={{ width: 'auto' }}
                value={exportTo} onChange={e => setExportTo(e.target.value)} />
              <select className="form-control" style={{ width: 'auto' }}
                value={exportType} onChange={e => setExportType(e.target.value)}>
                <option value="csv">CSV</option>
                <option value="xlsx">XLSX</option>
                <option value="json">JSON</option>
              </select>
              <button className="btn btn-sm" disabled={exporting} onClick={handleExport}>
                {exporting ? <><Loader2 size={14} className="icon-spin" /> {t('Exporting…')}</> : <><Download size={14} /> {t('Export')}</>}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="appt-row card">
                  <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <Sk w="60%" h="0.9rem" />
                      <Sk w="45%" h="0.75rem" />
                    </div>
                    <Sk style={{ flex: 1 }} h="0.85rem" w="75%" />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <Sk w="85px" h="0.85rem" />
                      <Sk w="45px" h="0.75rem" />
                    </div>
                    <Sk w="72px" h="22px" r="999px" />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <Sk w="32px" h="32px" r="6px" />
                      <Sk w="32px" h="32px" r="6px" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <DataTable
              columns={columns}
              rows={displayed}
              emptyMessage={t('No appointments found.')}
              getRowId={a => `appt-row-${a.id}`}
              highlightRowId={targetApptId ? `appt-row-${targetApptId}` : null}
              onRowClick={setDetailAppt}
              paginated
              pageSizeOptions={[10, 20, 30, 50, 100]}
              defaultPageSize={10}
              defaultSortKey="createdAt"
              defaultSortDir="desc"
            />
          </div>
        )}
      </div>

      <AppointmentDetailModal
        appointment={detailAppt}
        open={!!detailAppt}
        onClose={() => setDetailAppt(null)}
        actionLoading={actionLoading}
        onAction={handleAction}
        canDelete={false}
        canNoShow={!!detailAppt && pastGracePeriod(detailAppt)}
        onNoShow={handleNoShow}
        noShowHint={`${NO_SHOW_GRACE_MINUTES} min past reserved time — no-show`}
      />
    </div>
  );
}
