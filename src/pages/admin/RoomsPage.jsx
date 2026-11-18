import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, CheckCircle, Filter, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import CancelReasonDialog from '../../components/shared/CancelReasonDialog';
import { BUSINESS_BOOKING_CANCEL_REASONS } from '../../utils/cancelReasons';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useReservations } from '../../hooks/useReservations';
import { useRoomBooking } from '../../hooks/useRoomBooking';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import { reservationRef } from '../../utils/format';
import Sk from '../../components/shared/Skeleton';
import './AppointmentsPage.css';

const STATUSES = [null, 'pending', 'confirmed', 'completed', 'cancelled'];
const STATUS_LABELS = { null: 'All', pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };

export default function RoomsPage() {
  const { user, userProfile } = useAuth();
  const { fetchByAdmin, fetchOne } = useBusinesses();
  const { reservations, loading, fetchByBusiness, updateStatus } = useReservations();
  const { cancelReservation } = useRoomBooking();
  const { sendReservationConfirmed } = useEmailNotifications();

  const [businessId, setBusinessId] = useState(null);
  const [business, setBusiness] = useState(null);
  const [filter, setFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [searchParams] = useSearchParams();
  const targetResvId = searchParams.get('resv');

  useEffect(() => {
    const load = async () => {
      let biz = null;
      if (userProfile?.businessId) biz = await fetchOne(userProfile.businessId);
      else if (userProfile?.uid) biz = await fetchByAdmin(userProfile.uid);
      if (biz) {
        setBusinessId(biz.id);
        setBusiness(biz);
        fetchByBusiness(biz.id);
      }
    };
    if (userProfile) load();
  }, [userProfile]);

  useEffect(() => {
    if (!targetResvId || loading) return;
    const el = document.getElementById(`resv-row-${targetResvId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetResvId, loading, reservations.length]);

  const [cancelTarget, setCancelTarget] = useState(null);

  const handleAction = async (resv, status, reason) => {
    // Cancel goes through CancelReasonDialog first (reason required); the
    // dialog calls back here with the reason filled in.
    if (status === 'cancelled' && reason === undefined) { setCancelTarget(resv); return; }
    setActionLoading(resv.id + status);
    try {
      if (status === 'cancelled') {
        // if (!window.confirm('Cancel this reservation? This action is recorded against your account.')) {
        //   setActionLoading(null);
        //   return;
        // }
        // Atomic: flips status to cancelled and releases the held room-nights.
        await cancelReservation(resv, { role: 'business', uid: user?.uid, name: userProfile?.displayName || user?.displayName, reason });
        await fetchByBusiness(businessId);
      } else {
        await updateStatus(resv.id, status);
        if (status === 'confirmed') await sendReservationConfirmed(resv);
      }
      toast.success(`Reservation ${STATUS_LABELS[status] || status}.`);
    } catch {
      toast.error('Action failed.');
    } finally {
      setActionLoading(null);
      setCancelTarget(null);
    }
  };

  const displayed = reservations
    .filter(r => filter === null || r.status === filter)
    .filter(r => !dateFilter || (r.checkIn <= dateFilter && dateFilter < r.checkOut));

  // Nayasaa/Beach Huts reuse this same room-pool page/engine for outfit
  // rentals / beach huts — "Room"/"Nights"/"Rooms" is hotel wording, swap for
  // "Outfit"/"Days"/"Units" (nayasaa) or "Hut"/"Nights"/"Huts" (beachhuts,
  // which keeps hotel's real Nights/Guests since it's night-based too).
  const isNayasaa   = business?.type === 'nayasaa';
  const isBeachHuts = business?.type === 'beachhuts';

  return (
    <div className="admin-layout page">
      <div className="container">
        <h1 style={{ marginBottom: '1.5rem' }}>{isNayasaa ? 'Rentals' : isBeachHuts ? 'Huts' : 'Rooms'}</h1>

        {/* Filters */}
        <div className="appt-filters card">
          <div className="card-body appt-filters-inner">
            <div className="status-filter-tabs">
              {STATUSES.map(s => (
                <button key={String(s)} className={`status-tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                  {STATUS_LABELS[s]}
                  {s !== null && (
                    <span className="status-count">
                      {reservations.filter(r => r.status === s).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <input type="date" className="form-control" style={{ width: 'auto' }}
                value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
              {dateFilter && <button className="btn btn-ghost btn-sm" onClick={() => setDateFilter('')}>Clear</button>}
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
        ) : displayed.length === 0 ? (
          <div className="empty-state"><p>No reservations found.</p></div>
        ) : (
          <div className="appt-table card" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Guest</th>
                  <th>{isNayasaa ? 'Outfit' : isBeachHuts ? 'Hut' : 'Room Type'}</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  {/* <th>{isNayasaa ? 'Days' : 'Nights'}</th> */}
                  <th>{isNayasaa || isBeachHuts ? 'Days' : 'Nights'}</th>
                  <th>{isNayasaa ? 'Units' : isBeachHuts ? 'Huts' : 'Rooms'}</th>
                  <th>Guests</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(r => (
                  <tr key={r.id} id={`resv-row-${r.id}`} className={r.id === targetResvId ? 'row-highlighted' : ''}>
                    <td>
                      <span className="booking-ref-cell">{r.reservationRef || reservationRef(r.id)}</span>
                    </td>
                    <td>
                      <p className="customer-name">{r.customerName}</p>
                      <p className="customer-contact">{r.customerPhone}</p>
                      <p className="customer-contact">{r.customerEmail}</p>
                      {r.notes && <p className="customer-notes">📝 {r.notes}</p>}
                    </td>
                    <td>{r.roomTypeName || '—'}</td>
                    <td>{r.checkIn}</td>
                    <td>{r.checkOut}</td>
                    <td>{r.nights}</td>
                    <td>{r.roomsRequested}</td>
                    <td>{r.guestCount || '—'}</td>
                    <td>
                      <span className={`badge badge-${r.status}`}>{STATUS_LABELS[r.status] || r.status}</span>
                      {r.priceFlag && (
                        <span className={`badge badge-price-flag ${r.status !== 'cancelled' ? 'badge-price-flag-blink' : ''}`} style={{ marginLeft: '0.4rem' }} title={r.priceFlagReason || 'Price mismatch detected'}>
                          <AlertTriangle size={12} /> Price
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-btns">
                        {r.status === 'pending' && (
                          <button className="btn btn-sm action-confirm"
                            disabled={actionLoading === r.id + 'confirmed'}
                            onClick={() => handleAction(r, 'confirmed')}>
                            {actionLoading === r.id + 'confirmed' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><Check size={14} /> Confirm</>}
                          </button>
                        )}
                        {(r.status === 'pending' || r.status === 'confirmed') && (
                          <button className="btn btn-danger btn-sm"
                            disabled={actionLoading === r.id + 'cancelled'}
                            onClick={() => handleAction(r, 'cancelled')}>
                            {actionLoading === r.id + 'cancelled' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><X size={14} /> Cancel</>}
                          </button>
                        )}
                        {r.status === 'confirmed' && (
                          <button className="btn btn-sm action-complete"
                            disabled={actionLoading === r.id + 'completed'}
                            onClick={() => handleAction(r, 'completed')}>
                            {actionLoading === r.id + 'completed' ? <><Loader2 size={14} className="icon-spin" /> Wait…</> : <><CheckCircle size={14} /> Done</>}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
