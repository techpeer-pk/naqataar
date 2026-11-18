import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Building2, TrendingUp, CalendarCheck, Hotel, UtensilsCrossed } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts';
import { db } from '../../firebase';
import { CHART_COLORS, CHART_GRID, CHART_AXIS, CHART_TOOLTIP } from '../../utils/chartPalette';
import Sk from '../../components/shared/Skeleton';
import '../admin/Dashboard.css';

const EMPTY = {
  totalBusinesses: 0, activeBusinesses: 0, transactingBusinesses: 0,
  appointments: 0, pendingAppointments: 0,
  reservations: 0, pendingReservations: 0,
  orders: 0, pendingOrders: 0,
};

// B2B→B2C funnel: every business that signs up (Onboarded) should end up
// Active (owner switched it on) and eventually Transacting (has generated at
// least one appointment/reservation/order) — the whole point of Operations
// monitoring the pipeline, not just the endpoints independently.
export default function OverviewPage() {
  const [counts, setCounts]   = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bizSnap, apptSnap, resvSnap, orderSnap] = await Promise.all([
          getDocs(collection(db, 'businesses')),
          getDocs(collection(db, 'appointments')),
          getDocs(collection(db, 'reservations')),
          getDocs(collection(db, 'orders')),
        ]);
        const apptDocs  = apptSnap.docs.map(d => d.data());
        const resvDocs  = resvSnap.docs.map(d => d.data());
        const orderDocs = orderSnap.docs.map(d => d.data());
        const transactingIds = new Set([
          ...apptDocs.map(a => a.businessId),
          ...resvDocs.map(r => r.businessId),
          ...orderDocs.map(o => o.businessId),
        ].filter(Boolean));

        setCounts({
          totalBusinesses: bizSnap.size,
          activeBusinesses: bizSnap.docs.filter(d => d.data().isActive).length,
          transactingBusinesses: transactingIds.size,
          appointments: apptSnap.size,
          pendingAppointments: apptDocs.filter(a => a.status === 'pending').length,
          reservations: resvSnap.size,
          pendingReservations: resvDocs.filter(r => r.status === 'pending').length,
          orders: orderSnap.size,
          pendingOrders: orderDocs.filter(o => o.status === 'pending').length,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const funnel = useMemo(() => [
    { stage: 'Onboarded', count: counts.totalBusinesses },
    { stage: 'Active', count: counts.activeBusinesses },
    { stage: 'Transacting', count: counts.transactingBusinesses },
  ], [counts]);

  const byEngine = useMemo(() => [
    { engine: 'Appointments', count: counts.appointments },
    { engine: 'Reservations', count: counts.reservations },
    { engine: 'Orders', count: counts.orders },
  ], [counts]);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Business (B2B) → booking/order (B2C) pipeline, across every vertical.</p>
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
              <div className="stat-icon"><Building2 size={20} /></div>
              <div><div className="stat-value">{counts.totalBusinesses}</div><div className="stat-label">Businesses onboarded</div></div>
            </div>
            <div className="stat-card stat-card--blue">
              <div className="stat-icon"><TrendingUp size={20} /></div>
              <div><div className="stat-value">{counts.transactingBusinesses}</div><div className="stat-label">Businesses with bookings/orders</div></div>
            </div>
            <div className="stat-card stat-card--green">
              <div className="stat-icon"><CalendarCheck size={20} /></div>
              <div><div className="stat-value">{counts.appointments}</div><div className="stat-label">Appointments ({counts.pendingAppointments} pending)</div></div>
            </div>
            <div className="stat-card stat-card--teal">
              <div className="stat-icon"><Hotel size={20} /></div>
              <div><div className="stat-value">{counts.reservations}</div><div className="stat-label">Reservations ({counts.pendingReservations} pending)</div></div>
            </div>
            <div className="stat-card stat-card--amber">
              <div className="stat-icon"><UtensilsCrossed size={20} /></div>
              <div><div className="stat-value">{counts.orders}</div><div className="stat-label">Food orders ({counts.pendingOrders} pending)</div></div>
            </div>
          </div>

          <div className="profile-grid" style={{ marginTop: '1.25rem', alignItems: 'stretch' }}>
            <div className="card" style={{ padding: '1.5rem 1.5rem 0.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>B2B → B2C funnel</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: 'var(--text)' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip contentStyle={CHART_TOOLTIP} />
                  <Bar dataKey="count" fill={CHART_COLORS.navy} barSize={22} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="count" position="right" style={{ fill: 'var(--text-mid)', fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: '1.5rem 1.5rem 0.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>B2C volume by booking engine</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byEngine} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="engine" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip contentStyle={CHART_TOOLTIP} />
                  <Bar dataKey="count" barSize={28} radius={[4, 4, 0, 0]}>
                    {byEngine.map((e, i) => <Cell key={e.engine} fill={[CHART_COLORS.navy, CHART_COLORS.teal, CHART_COLORS.orange][i]} />)}
                    <LabelList dataKey="count" position="top" style={{ fill: 'var(--text-mid)', fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
