import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, CheckCircle, XCircle, ArrowRight, Plus, ShieldCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useBusinesses } from '../../hooks/useBusinesses';
import { useAppointments } from '../../hooks/useAppointments';
import { useOrders } from '../../hooks/useOrders';
import { bookingRef, formatTime12h } from '../../utils/format';
import { subscriptionStatus } from '../../utils/subscription';
import Sk from '../../components/shared/Skeleton';
import AppointmentDetailModal from '../../components/shared/AppointmentDetailModal';
import './Dashboard.css';
import { t, statusLabel } from '../../i18n';

// Trial/expiry warnings only start mattering this close to the deadline —
// no point nagging an owner with 25 days still left on their trial.
const WARN_WITHIN_DAYS = 7;

function DashboardSkeleton() {
  return (
    <div className="admin-layout page">
      <div className="container">
        <div className="dashboard-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Sk w="140px" h="2rem" />
            <Sk w="220px" h="0.85rem" />
          </div>
          <Sk w="120px" h="36px" r="8px" />
        </div>
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-card stat-card--primary" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Sk w="44px" h="44px" r="10px" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <Sk w="32px" h="1.6rem" />
                <Sk w="100px" h="0.75rem" />
              </div>
            </div>
          ))}
        </div>
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <Sk w="160px" h="1.1rem" />
            <Sk w="70px" h="0.85rem" />
          </div>
          <div className="appt-table card">
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <Sk w="70%" h="0.9rem" />
                    <Sk w="50%" h="0.75rem" />
                  </div>
                  <Sk style={{ flex: 1 }} h="0.85rem" w="80%" />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <Sk w="90px" h="0.85rem" />
                    <Sk w="50px" h="0.75rem" />
                  </div>
                  <Sk w="72px" h="22px" r="999px" />
                  <Sk w="64px" h="30px" r="6px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { userProfile } = useAuth();
  const { fetchByAdmin, fetchOne, update } = useBusinesses();
  const { appointments, loading, fetchByBusiness } = useAppointments();
  const { orders, fetchByBusiness: fetchOrdersByBusiness } = useOrders();
  const [business, setBusiness] = useState(null);
  const [togglingPayment, setTogglingPayment] = useState(false);
  const [viewAppt, setViewAppt] = useState(null);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!userProfile?.uid) return;
    const load = async () => {
      let biz = null;
      if (userProfile.businessId) {
        biz = await fetchOne(userProfile.businessId);
      } else {
        biz = await fetchByAdmin(userProfile.uid);
      }
      setBusiness(biz);
      if (biz) {
        fetchByBusiness(biz.id);
        // Needs-review count spans food orders too, when the vendor takes them.
        if (biz.offersOrdering === true) fetchOrdersByBusiness(biz.id);
      }
    };
    load();
  }, [userProfile]);

  const handleToggleAdvancePayment = async () => {
    if (!business) return;
    const next = !business.requiresAdvancePayment;
    setTogglingPayment(true);
    try {
      await update(business.id, { requiresAdvancePayment: next });
      setBusiness(b => ({ ...b, requiresAdvancePayment: next }));
      toast.success(next ? t('Advance payment required.') : t('Advance payment turned off.'));
    } catch {
      toast.error(t('Could not update. Try again.'));
    } finally {
      setTogglingPayment(false);
    }
  };

  const todayAppts   = appointments.filter(a => a.date === todayStr);
  const pending      = appointments.filter(a => a.status === 'pending');
  const confirmed    = appointments.filter(a => a.status === 'confirmed');
  const completed    = appointments.filter(a => a.status === 'completed');

  // Pending + a screenshot attached = a real admin decision waiting, not
  // just an ordinary new booking — that's what "needs review" means here.
  const reviewAppts = appointments.filter(a => a.status === 'pending' && a.paymentProofUrl);
  const reviewOrders = orders.filter(o => o.status === 'pending' && o.paymentProofUrl);
  const needsReviewCount = reviewAppts.length + reviewOrders.length;

  const stats = [
    { label: "Today's",   value: todayAppts.length, color: 'primary', icon: <CalendarCheck size={22} /> },
    { label: 'Pending',   value: pending.length,    color: 'amber',   icon: <Clock size={22} /> },
    { label: 'Confirmed', value: confirmed.length,  color: 'green',   icon: <CheckCircle size={22} /> },
    { label: 'Completed', value: completed.length,  color: 'blue',    icon: <CheckCircle size={22} /> },
  ];

  if (loading) return <DashboardSkeleton />;

  if (!business && !loading) {
    return (
      <div className="admin-layout page">
        <div className="container">
          <div className="empty-state">
            <p>{t('No clinic found for your account.')}</p>
            <Link to="/admin/register" className="btn btn-primary">{t('Register Clinic')}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (business.isActive === false) {
    return (
      <div className="admin-layout page">
        <div className="container">
          <div className="empty-state">
            <Clock size={36} />
            <p>{t('"{name}" is waiting for approval.', { name: business.name })}</p>
            <p className="text-muted">
              {/* A Qunjee SuperAdmin needs to review and approve your registration before customers */}
              {t('The Naqatar team needs to review and approve your registration before customers can find or book with you. You can still set up your profile and services in the meantime —')}{' '}
              <Link to="/admin/profile">{t('go to Profile')}</Link>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const subStatus = subscriptionStatus(business);
  const daysLeft  = subStatus.until ? Math.ceil((subStatus.until - new Date()) / (24 * 60 * 60 * 1000)) : null;
  const showSubBanner = subStatus.kind !== 'legacy' && (!subStatus.active || daysLeft <= WARN_WITHIN_DAYS);

  return (
    <div className="admin-layout page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>{t('Dashboard')}</h1>
            <p className="text-muted">{business?.name} · {format(new Date(), 'EEEE, d MMMM yyyy')}</p>
          </div>
          <Link to="/admin/services" className="btn btn-primary btn-sm">
            <Plus size={16} /> {['hotel', 'nayasaa', 'beachhuts'].includes(business?.type) ? 'Add Room Type' : t('Add Service')}
          </Link>
        </div>

        {/* Subscription/trial banner — only for lapsed or soon-to-lapse
            accounts; a legacy business or one with plenty of runway left
            sees nothing here. See docs/Billing-Subscription.md. */}
        {showSubBanner && (
          <div className={`card needs-review-banner ${!subStatus.active ? 'needs-review-banner--danger' : ''}`}>
            <div className="card-body needs-review-banner-inner">
              <div className="needs-review-info">
                <AlertCircle size={20} />
                <div>
                  <p className="needs-review-title">
                    {!subStatus.active
                      ? t('Your account is suspended — new bookings are paused')
                      : subStatus.kind === 'trial'
                        ? t(daysLeft === 1 ? 'Your free trial ends in {n} day' : 'Your free trial ends in {n} days', { n: Math.max(daysLeft, 0) })
                        : t(daysLeft === 1 ? 'Your subscription ends in {n} day' : 'Your subscription ends in {n} days', { n: Math.max(daysLeft, 0) })}
                  </p>
                  <p className="text-muted needs-review-sub">
                    {!subStatus.active
                      ? t('Existing bookings and your profile are unaffected — only new customer bookings are on hold.')
                      // : 'Contact the Qunjee team to continue after this date.'}
                      : t('Contact the Naqatar team to continue after this date.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Needs-review alert — only shown when something is actually waiting,
            so it doesn't clutter the dashboard for businesses with the toggle off. */}
        {needsReviewCount > 0 && (
          <div className="card needs-review-banner">
            <div className="card-body needs-review-banner-inner">
              <div className="needs-review-info">
                <AlertCircle size={20} />
                <div>
                  <p className="needs-review-title">
                    {t('{n} awaiting payment review', { n: needsReviewCount })}
                  </p>
                  <p className="text-muted needs-review-sub">
                    {t('Customers uploaded a payment screenshot — verify it before confirming.')}
                  </p>
                </div>
              </div>
              <div className="needs-review-actions">
                {reviewAppts.length > 0 && (
                  <Link to="/admin/appointments" className="btn btn-primary btn-sm">
                    {t('Bookings ({n})', { n: reviewAppts.length })}
                  </Link>
                )}
                {reviewOrders.length > 0 && (
                  <Link to="/admin/orders" className="btn btn-primary btn-sm">
                    Orders ({reviewOrders.length})
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Advance payment quick-toggle — hibernated 2026-09-11 (businessAdmin
        Dashboard, on request).
        <div className="card adv-payment-widget">
          <div className="card-body adv-payment-widget-inner">
            <div className="adv-payment-widget-info">
              <ShieldCheck size={20} />
              <div>
                <p className="adv-payment-widget-title">Advance Payment</p>
                <p className="text-muted adv-payment-widget-sub">
                  {business?.requiresAdvancePayment
                    ? 'On — customers must upload a payment screenshot before booking.'
                    : 'Off — anyone can book without paying. Turn on to block spam/prank bookings.'}
                </p>
              </div>
            </div>
            <div className="adv-payment-widget-actions">
              <Link to="/admin/profile" className="btn btn-ghost btn-sm">Bank Details</Link>
              <button
                type="button"
                role="switch"
                aria-checked={!!business?.requiresAdvancePayment}
                className={`toggle-switch ${business?.requiresAdvancePayment ? 'on' : ''}`}
                disabled={togglingPayment}
                onClick={handleToggleAdvancePayment}
              >
                <span className="toggle-switch-knob" />
              </button>
            </div>
          </div>
        </div>
        */}

        {/* Stats */}
        <div className="stats-grid">
          {stats.map(s => (
            <div key={s.label} className={`stat-card stat-card--${s.color}`}>
              <div className="stat-icon">{s.icon}</div>
              <div>
                <p className="stat-value">{s.value}</p>
                <p className="stat-label">{t("{label} Appointments", { label: t(s.label) })}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent appointments */}
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>{t('Recent Appointments')}</h2>
            <Link to="/admin/appointments" className="view-all-link">
              {t('View All')} <ArrowRight size={14} />
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="empty-state">
              <CalendarCheck size={36} />
              <p>{t('No appointments yet.')}</p>
            </div>
          ) : (
            <div className="appt-table card">
              <table>
                <thead>
                  <tr>
                    <th>{t('Customer')}</th>
                    <th>{t('Service')}</th>
                    <th>{t('Date & Time')}</th>
                    <th>{t('Status')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 8).map(a => (
                    <tr key={a.id}>
                      <td>
                        <p className="customer-name">{a.customerName}</p>
                        <p className="customer-contact">{a.bookingRef || bookingRef(a.id)}</p>
                      </td>
                      <td>{a.serviceName}</td>
                      <td>
                        <p>{a.date}</p>
                        <p className="customer-contact">{formatTime12h(a.time)}</p>
                      </td>
                      <td><span className={`badge badge-${a.status}`}>{statusLabel(a.status)}</span></td>
                      <td>
                        <div className="recent-appt-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViewAppt(a)}>{t('View')}</button>
                          <Link to="/admin/appointments" className="btn btn-ghost btn-sm">{t('Manage')}</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AppointmentDetailModal
        appointment={viewAppt}
        open={!!viewAppt}
        onClose={() => setViewAppt(null)}
        canAct={false}
        canDelete={false}
      />
    </div>
  );
}
