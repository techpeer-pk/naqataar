import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarCheck, Clock, MapPin, LogIn, X, UtensilsCrossed, ShieldCheck, BedDouble } from 'lucide-react';
import { bookingRef, orderRef, reservationRef, formatTime12h, formatDate } from '../../utils/format';
import Sk from '../../components/shared/Skeleton';
import toast from 'react-hot-toast';
import CancelReasonDialog from '../../components/shared/CancelReasonDialog';
import { CUSTOMER_CANCEL_REASONS } from '../../utils/cancelReasons';
import { useAppointments } from '../../hooks/useAppointments';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../hooks/useBooking';
import { useRoomBooking } from '../../hooks/useRoomBooking';
import { useEmailNotifications } from '../../hooks/useEmailNotifications';
import ReminderBanner from '../../components/public/ReminderBanner';
import './MyAppointmentsPage.css';
import { t, statusLabel } from '../../i18n';

function sortAppointments(list) {
  return [...list].sort((a, b) => {
    const aTime = a.appointmentDatetime?.toDate?.()?.getTime() || 0;
    const bTime = b.appointmentDatetime?.toDate?.()?.getTime() || 0;
    return bTime - aTime;
  });
}

export default function MyAppointmentsPage() {
  const { user, isCustomer } = useAuth();
  const { appointments: allAppointments, loading, subscribeByEmail: subscribeAppointmentsByEmail } = useAppointments();
  // Naqatar is clinic-only, but the backend is shared with QuFree: the same
  // customer account may also have salon/restaurant appointments and hotel
  // reservations there. Show clinic bookings only; don't load reservations.
  const appointments = allAppointments.filter(a => a.businessType === 'clinic');
  const reservations = [];
  const { orders, subscribeByEmail } = useOrders();
  const { cancelAppointment } = useBooking();
  const { cancelReservation } = useRoomBooking();
  const { sendCancellation } = useEmailNotifications();
  const [email, setEmail]       = useState('');
  const [searched, setSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancellingResvId, setCancellingResvId] = useState(null);
  const [searchParams]  = useSearchParams();
  const targetApptId    = searchParams.get('appt');

  useEffect(() => {
    if (user && isCustomer) {
      setEmail(user.email);
      setSearched(true);
      // Live — a business admin/superAdmin action (confirm, no-show, cancel)
      // shows up here without a manual reload, same as orders already do.
      const unsubAppointments = subscribeAppointmentsByEmail(user.email);
      // So each booking card can point to its linked dine-in pre-order.
      const unsubOrders = subscribeByEmail(user.email);
      return () => { unsubAppointments(); unsubOrders(); };
    }
  }, [user, isCustomer]);

  // Deep link from "Advance Food Order" — jump straight to the matching
  // card instead of dropping the customer at the top of a long list.
  useEffect(() => {
    if (!targetApptId || loading) return;
    const el = document.getElementById(`appt-card-${targetApptId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetApptId, loading, appointments.length]);

  // Cancel opens CancelReasonDialog first (reason optional for customers);
  // it calls the matching handler back with the reason ('' if skipped).
  const [cancelTarget, setCancelTarget] = useState(null); // { kind: 'appt' | 'resv', item }

  const handleCancel = async (appt, reason) => {
    // if (!window.confirm('Cancel this appointment? This action is recorded against your account.')) return;
    if (reason === undefined) { setCancelTarget({ kind: 'appt', item: appt }); return; }
    setCancellingId(appt.id);
    try {
      // Atomic: flips status to cancelled and releases the held slot(s).
      // No manual refetch needed — the live subscription picks it up.
      await cancelAppointment(appt, { role: 'customer', uid: user?.uid, name: user?.displayName, reason });
      await sendCancellation(appt, reason);
      toast.success(t('Appointment cancelled.'));
    } catch {
      toast.error(t('Could not cancel. Try again.'));
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
    }
  };

  const handleCancelReservation = async (resv, reason) => {
    // if (!window.confirm('Cancel this reservation? This action is recorded against your account.')) return;
    if (reason === undefined) { setCancelTarget({ kind: 'resv', item: resv }); return; }
    setCancellingResvId(resv.id);
    try {
      // Atomic: flips status to cancelled and releases the held room-nights.
      // No manual refetch needed — the live subscription picks it up.
      await cancelReservation(resv, { role: 'customer', uid: user?.uid, name: user?.displayName, reason });
      toast.success(t('Reservation cancelled.'));
    } catch {
      toast.error(t('Could not cancel. Try again.'));
    } finally {
      setCancellingResvId(null);
      setCancelTarget(null);
    }
  };

  const sorted   = sortAppointments(appointments);
  const isPast   = a => ['completed', 'cancelled', 'no_show'].includes(a.status);
  const upcoming = sorted.filter(a => !isPast(a));
  const past     = sorted.filter(isPast);

  const sortedResv   = [...reservations].sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));
  const isPastResv   = r => ['completed', 'cancelled'].includes(r.status);
  const upcomingResv = sortedResv.filter(r => !isPastResv(r));
  const pastResv     = sortedResv.filter(isPastResv);

  return (
    <div className="my-appts page">
      <div className="container my-appts-container">

        <div className="my-appts-header">
          <CalendarCheck size={28} />
          <div>
            <h1>{t('My Appointments')}</h1>
            {user && isCustomer
              ? <p className="text-muted">{t('Signed in as')} <strong>{user.email}</strong></p>
              : <p className="text-muted">{t('Sign in to view your bookings.')}</p>
            }
          </div>
        </div>

        {/* Guests must sign in — appointment data is private (no anonymous lookup). */}
        {!(user && isCustomer) && (
          <div className="empty-state">
            <LogIn size={40} />
            <p>{t('Sign in to view and manage your bookings.')}</p>
            <Link to="/index/login" className="btn btn-primary">{t('Sign In')}</Link>
            <p className="my-appts-signin-hint" style={{ marginTop: '0.75rem' }}>
              {t('New here?')} <Link to="/index/register">{t('Create a free account')}</Link>
            </p>
          </div>
        )}

        {/* Skeleton */}
        {searched && loading && (
          <div className="appt-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="appt-card card">
                <div className="card-body">
                  <div className="appt-card-top">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                      <Sk w="55%" h="1rem" />
                      <Sk w="40%" h="0.8rem" />
                    </div>
                    <Sk w="72px" h="22px" r="999px" />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                    <Sk w="90px" h="0.8rem" />
                    <Sk w="60px" h="0.8rem" />
                    <Sk w="100px" h="0.8rem" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {searched && !loading && (
          <>
            {appointments.length === 0 && reservations.length === 0 ? (
              <div className="empty-state">
                <CalendarCheck size={40} />
                <p>{t('No bookings found for')} <strong>{email}</strong>.</p>
              </div>
            ) : (
              <>
                {upcoming.map(a => (
                  <ReminderBanner key={`reminder-${a.id}`} appointment={a} />
                ))}
                {(upcoming.length > 0 || upcomingResv.length > 0) && (
                  <>
                    <h2 className="appt-section-title">{t('Upcoming')}</h2>
                    <div className="appt-list">
                      {upcoming.map(a => (
                        <AppointmentCard
                          key={a.id}
                          appt={a}
                          order={orders.find(o => o.appointmentId === a.id)}
                          canCancel={user && a.customerId === user.uid}
                          cancelling={cancellingId === a.id}
                          onCancel={() => handleCancel(a)}
                          highlighted={a.id === targetApptId}
                        />
                      ))}
                      {upcomingResv.map(r => (
                        <ReservationCard
                          key={r.id}
                          resv={r}
                          canCancel={user && r.customerId === user.uid}
                          cancelling={cancellingResvId === r.id}
                          onCancel={() => handleCancelReservation(r)}
                        />
                      ))}
                    </div>
                  </>
                )}
                {(past.length > 0 || pastResv.length > 0) && (
                  <>
                    <h2 className="appt-section-title">{t('Past')}</h2>
                    <div className="appt-list">
                      {past.map(a => (
                        <AppointmentCard
                          key={a.id}
                          appt={a}
                          order={orders.find(o => o.appointmentId === a.id)}
                          highlighted={a.id === targetApptId}
                        />
                      ))}
                      {pastResv.map(r => (
                        <ReservationCard key={r.id} resv={r} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      <CancelReasonDialog
        open={!!cancelTarget}
        title={cancelTarget?.kind === 'resv' ? t('Cancel Reservation') : t('Cancel Appointment')}
        message="This action is recorded against your account and can't be undone."
        presets={CUSTOMER_CANCEL_REASONS}
        loading={!!cancelTarget && (cancelTarget.kind === 'resv' ? cancellingResvId : cancellingId) === cancelTarget.item.id}
        onConfirm={reason => cancelTarget.kind === 'resv'
          ? handleCancelReservation(cancelTarget.item, reason)
          : handleCancel(cancelTarget.item, reason)}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
}

function AppointmentCard({ appt, order, canCancel, cancelling, onCancel, highlighted }) {
  return (
    <div id={`appt-card-${appt.id}`} className={`appt-card card${highlighted ? ' card-highlighted' : ''}`}>
      <div className="card-body">
        <div className="appt-card-top">
          <div>
            <p className="appt-business">{appt.businessName}</p>
            <p className="appt-service">{appt.serviceName}</p>
            <p className="appt-ref">ID: {appt.bookingRef || bookingRef(appt.id)}</p>
            {appt.createdAt && (
              <p className="appt-requested">
                Requested: {formatDate(appt.createdAt)}, {appt.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            )}
          </div>
          <span className={`badge badge-${appt.status}`}>{statusLabel(appt.status)}</span>
        </div>
        <div className="appt-card-meta">
          <span><CalendarCheck size={13} /> {appt.date}</span>
          <span><Clock size={13} /> {formatTime12h(appt.time)}</span>
          {appt.businessAddress && <span><MapPin size={13} /> {appt.businessAddress}</span>}
        </div>
        {appt.status === 'cancelled' && appt.cancelReason && (
          <p className="verify-pending-note">
            <X size={13} /> Cancellation reason: {appt.cancelReason}
          </p>
        )}
        {appt.status === 'no_show' && (
          <p className="verify-pending-note">
            <X size={13} /> Marked as a no-show{appt.paymentProofUrl ? ' — the booking fee was forfeited.' : '.'}
          </p>
        )}
        {appt.status === 'pending' && appt.paymentProofUrl && (
          <p className="verify-pending-note">
            <ShieldCheck size={13} /> Payment screenshot received — the business is verifying it before confirming.
          </p>
        )}
        {order && (
          <Link to={`/qunjeeats/my-orders?order=${order.id}`} className="appt-order-link">
            <UtensilsCrossed size={14} />
            <span>
              <strong>Advance Food Order placed</strong> for this booking — {orderRef(order.id)} ({order.status})
            </span>
          </Link>
        )}
        {canCancel && (
          <button className="btn btn-danger btn-sm appt-cancel-btn" disabled={cancelling} onClick={onCancel}>
            <X size={14} /> {cancelling ? t('Cancelling…') : t('Cancel Appointment')}
          </button>
        )}
      </div>
    </div>
  );
}

function ReservationCard({ resv, canCancel, cancelling, onCancel }) {
  // Nayasaa/Beach Huts reuse the room-pool engine for outfit rentals / beach
  // huts — "room"/"night" is hotel wording, Nayasaa needs "unit"/"day" and
  // Beach Huts needs "hut"/"night" instead (same terminology their own
  // booking pages already use when creating these reservations).
  const isNayasaa = resv.businessType === 'nayasaa';
  const unitWord   = isNayasaa ? 'unit' : resv.businessType === 'beachhuts' ? 'hut' : 'room';
  // const periodWord = isNayasaa ? 'day'  : 'night';
  // Beach Huts priced per day, not per night (2026-09-24)
  const periodWord = isNayasaa || resv.businessType === 'beachhuts' ? 'day' : 'night';
  return (
    <div className="appt-card card">
      <div className="card-body">
        <div className="appt-card-top">
          <div>
            <p className="appt-business">{resv.businessName}</p>
            {resv.roomTypeName && <p className="appt-service">{resv.roomTypeName}</p>}
            <p className="appt-service">{resv.roomsRequested} {unitWord}{resv.roomsRequested > 1 ? 's' : ''} — {resv.nights} {periodWord}{resv.nights > 1 ? 's' : ''}{resv.guestCount ? ` — ${resv.guestCount} guest${resv.guestCount > 1 ? 's' : ''}` : ''}</p>
            <p className="appt-ref">ID: {resv.reservationRef || reservationRef(resv.id)}</p>
          </div>
          <span className={`badge badge-${resv.status}`}>{resv.status}</span>
        </div>
        <div className="appt-card-meta">
          <span><BedDouble size={13} /> {resv.checkIn} → {resv.checkOut}</span>
          {resv.businessAddress && <span><MapPin size={13} /> {resv.businessAddress}</span>}
        </div>
        {resv.status === 'cancelled' && resv.cancelReason && (
          <p className="verify-pending-note">
            <X size={13} /> Cancellation reason: {resv.cancelReason}
          </p>
        )}
        {canCancel && (
          <button className="btn btn-danger btn-sm appt-cancel-btn" disabled={cancelling} onClick={onCancel}>
            <X size={14} /> {cancelling ? t('Cancelling…') : t('Cancel Reservation')}
          </button>
        )}
      </div>
    </div>
  );
}
