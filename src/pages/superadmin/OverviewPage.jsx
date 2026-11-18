import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { eachDayOfInterval, subDays, format } from 'date-fns';
import { Users, Building2, CalendarCheck, CheckCircle2, Eye, Hotel, Headphones, UtensilsCrossed } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts';
import { db } from '../../firebase';
import { useVisitorStats } from '../../hooks/useVisitorCounter';
import { subscriptionStatus } from '../../utils/subscription';
import { CHART_COLORS, STATUS_COLORS, CHART_GRID, CHART_AXIS, CHART_TOOLTIP, formatCompactNumber } from '../../utils/chartPalette';
import Sk from '../../components/shared/Skeleton';
import '../admin/Dashboard.css';

const EMPTY = { users: 0, businesses: 0, activeBusinesses: 0, subscriptionExpired: 0, appointments: 0, pending: 0, reservations: 0, pendingReservations: 0, orders: 0, pendingOrders: 0, openTickets: 0, escalatedTickets: 0 };
const STATUSES = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled'];
const STATUS_LABELS = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', no_show: 'No-Show', cancelled: 'Cancelled' };
const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
const ORDER_STATUS_LABELS = { pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'On the way', completed: 'Completed', cancelled: 'Cancelled' };

export default function OverviewPage() {
  const [counts, setCounts]     = useState(EMPTY);
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const visitorStats = useVisitorStats();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersSnap, businessesSnap, apptsSnap, resvSnap, ordersSnap, ticketsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'businesses')),
          getDocs(collection(db, 'appointments')),
          getDocs(collection(db, 'reservations')),
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'supportTickets')),
        ]);
        const apptDocs = apptsSnap.docs.map(d => d.data());
        const resvDocs = resvSnap.docs.map(d => d.data());
        const orderDocs = ordersSnap.docs.map(d => d.data());
        const ticketDocs = ticketsSnap.docs.map(d => d.data());
        setAppointments(apptDocs);
        setOrders(orderDocs);
        setCounts({
          users: usersSnap.size,
          businesses: businessesSnap.size,
          activeBusinesses: businessesSnap.docs.filter(d => d.data().isActive).length,
          // Independent of isActive above (a manual admin toggle) — this is
          // the trial/activeUntil gate from useBooking/useOrderPlacement
          // that actually blocks new bookings/orders. See BusinessesPage's
          // Subscription column/filter for the per-business breakdown.
          subscriptionExpired: businessesSnap.docs.filter(d => !subscriptionStatus(d.data()).active).length,
          appointments: apptsSnap.size,
          pending: apptDocs.filter(a => a.status === 'pending').length,
          reservations: resvSnap.size,
          pendingReservations: resvDocs.filter(r => r.status === 'pending').length,
          orders: ordersSnap.size,
          pendingOrders: orderDocs.filter(o => o.status === 'pending').length,
          openTickets: ticketDocs.filter(t => t.status === 'open').length,
          escalatedTickets: ticketDocs.filter(t => t.status === 'escalated').length,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const byDay = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() }).map(d => format(d, 'yyyy-MM-dd'));
    const counted = {};
    appointments.forEach(a => { if (a.date) counted[a.date] = (counted[a.date] || 0) + 1; });
    return days.map(date => ({ date: date.slice(5), count: counted[date] || 0 }));
  }, [appointments]);

  const byStatus = useMemo(() => STATUSES.map(status => ({
    status, count: appointments.filter(a => a.status === status).length,
  })), [appointments]);

  const byOrderStatus = useMemo(() => ORDER_STATUSES.map(status => ({
    status, count: orders.filter(o => o.status === status).length,
  })), [orders]);

  const topBusinesses = useMemo(() => {
    const map = {};
    appointments.forEach(a => { const k = a.businessName || 'Unknown'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 5).map(([business, count]) => ({ business, count }));
  }, [appointments]);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>System-wide counts across every business.</p>
        </div>
      </div>

      {loading ? (
        <div className="stats-grid">
          {Array.from({ length: 4 }).map((_, i) => <Sk key={i} h="88px" r="var(--radius)" />)}
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-card--primary">
              <div className="stat-icon"><Users size={20} /></div>
              <div><div className="stat-value">{counts.users}</div><div className="stat-label">Users</div></div>
            </div>
            <div className="stat-card stat-card--blue" title="Active = the isActive toggle; subscription expired is a separate gate that blocks new bookings/orders regardless of isActive — see Businesses page">
              <div className="stat-icon"><Building2 size={20} /></div>
              <div><div className="stat-value">{counts.businesses}</div><div className="stat-label">Businesses ({counts.activeBusinesses} active, {counts.subscriptionExpired} sub. expired)</div></div>
            </div>
            <div className="stat-card stat-card--green">
              <div className="stat-icon"><CalendarCheck size={20} /></div>
              <div><div className="stat-value">{counts.appointments}</div><div className="stat-label">Appointments</div></div>
            </div>
            <div className="stat-card stat-card--amber">
              <div className="stat-icon"><CheckCircle2 size={20} /></div>
              <div><div className="stat-value">{counts.pending}</div><div className="stat-label">Pending appointments</div></div>
            </div>
            <div className="stat-card stat-card--teal">
              <div className="stat-icon"><Hotel size={20} /></div>
              <div><div className="stat-value">{counts.reservations}</div><div className="stat-label">Reservations ({counts.pendingReservations} pending)</div></div>
            </div>
            <div className="stat-card stat-card--amber">
              <div className="stat-icon"><UtensilsCrossed size={20} /></div>
              <div><div className="stat-value">{counts.orders}</div><div className="stat-label">Food orders ({counts.pendingOrders} pending)</div></div>
            </div>
            <div className="stat-card stat-card--blue" title="View full ticket queue in the CSR console (/qufreecrm) — requires separate CSR-agent access">
              <div className="stat-icon"><Headphones size={20} /></div>
              <div><div className="stat-value">{counts.openTickets}</div><div className="stat-label">Open tickets ({counts.escalatedTickets} escalated)</div></div>
            </div>
            <div className="stat-card stat-card--blue">
              <div className="stat-icon"><Eye size={20} /></div>
              <div><div className="stat-value">{visitorStats.total}</div><div className="stat-label">Site visits ({visitorStats.unique} unique, {visitorStats.today} today)</div></div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1.25rem', padding: '1.5rem 1.5rem 0.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Appointments — last 30 days</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={byDay} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} width={32} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Area type="monotone" dataKey="count" name="Appointments" stroke={CHART_COLORS.navy} strokeWidth={2} fill={CHART_COLORS.navy} fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="profile-grid" style={{ marginTop: '1.25rem', alignItems: 'stretch' }}>
            <div className="card" style={{ padding: '1.5rem 1.5rem 0.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Appointments by status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byStatus} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="status" tickFormatter={s => STATUS_LABELS[s] || s} tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={s => STATUS_LABELS[s] || s} />
                  <Bar dataKey="count" barSize={24} radius={[4, 4, 0, 0]}>
                    {byStatus.map(s => <Cell key={s.status} fill={STATUS_COLORS[s.status]} />)}
                    <LabelList dataKey="count" position="top" style={{ fill: 'var(--text-mid)', fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '1.5rem 1.5rem 0.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Food orders by status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byOrderStatus} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="status" tickFormatter={s => ORDER_STATUS_LABELS[s] || s} tick={{ fontSize: 10, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={36} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip contentStyle={CHART_TOOLTIP} labelFormatter={s => ORDER_STATUS_LABELS[s] || s} />
                  <Bar dataKey="count" barSize={20} radius={[4, 4, 0, 0]}>
                    {byOrderStatus.map(s => <Cell key={s.status} fill={STATUS_COLORS[s.status]} />)}
                    <LabelList dataKey="count" position="top" style={{ fill: 'var(--text-mid)', fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '1.5rem 1.5rem 0.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Top 5 businesses by bookings</h3>
              {topBusinesses.length === 0 ? <p className="empty-state">No bookings yet.</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topBusinesses} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="business" tick={{ fontSize: 12, fill: 'var(--text)' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Bar dataKey="count" fill={CHART_COLORS.navy} barSize={18} radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-mid)', fontSize: 11 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
