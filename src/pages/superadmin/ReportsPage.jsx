import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { format, subDays, startOfMonth } from 'date-fns';
import { Wallet, CalendarCheck, AlertTriangle, UtensilsCrossed, Hotel } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LabelList, Legend,
} from 'recharts';
import { db } from '../../firebase';
import { CHART_COLORS, CHART_GRID, CHART_AXIS, CHART_TOOLTIP, formatCurrency, formatCompactNumber } from '../../utils/chartPalette';
import DataTable from '../../components/superadmin/DataTable';
import '../admin/Dashboard.css';
import '../admin/AppointmentsPage.css';

const PRESETS = [
  { key: '7d',   label: 'Last 7 days',  from: () => subDays(new Date(), 7) },
  { key: '30d',  label: 'Last 30 days', from: () => subDays(new Date(), 30) },
  { key: '90d',  label: 'Last 90 days', from: () => subDays(new Date(), 90) },
  { key: 'mtd',  label: 'Month to date', from: () => startOfMonth(new Date()) },
];

// Orders don't carry a plain "date" string like appointments do — only a
// Firestore createdAt Timestamp — so bucket them into the same yyyy-MM-dd
// shape appointments already use, for one shared range-filter/day-bucketing.
function toDateStr(ts) {
  if (!ts) return null;
  const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : null;
  return ms ? format(new Date(ms), 'yyyy-MM-dd') : null;
}

export default function ReportsPage() {
  const [preset, setPreset] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [apptSnap, orderSnap, resvSnap] = await Promise.all([
          getDocs(query(collection(db, 'appointments'), where('status', '==', 'completed'))),
          getDocs(query(collection(db, 'orders'), where('status', '==', 'completed'))),
          getDocs(query(collection(db, 'reservations'), where('status', '==', 'completed'))),
        ]);
        setAppointments(apptSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data(), _date: toDateStr(d.data().createdAt) })));
        setReservations(resvSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const range = useMemo(() => {
    if (preset === 'custom') {
      return { from: customFrom, to: customTo || format(new Date(), 'yyyy-MM-dd') };
    }
    const p = PRESETS.find(p => p.key === preset);
    return { from: format(p.from(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') };
  }, [preset, customFrom, customTo]);

  const inRange = useMemo(
    () => appointments.filter(a => a.date >= range.from && a.date <= range.to),
    [appointments, range],
  );
  const inRangeOrders = useMemo(
    () => orders.filter(o => o._date && o._date >= range.from && o._date <= range.to),
    [orders, range],
  );
  // checkIn is already a "yyyy-MM-dd" string (see useRoomBooking.js), same as
  // appointments' `.date` — no createdAt-to-string conversion needed here.
  const inRangeReservations = useMemo(
    () => reservations.filter(r => r.checkIn >= range.from && r.checkIn <= range.to),
    [reservations, range],
  );

  const priced        = inRange.filter(a => a.servicePrice != null);
  const pricedResv     = inRangeReservations.filter(r => r.totalPrice != null);
  const excluded       = (inRange.length - priced.length) + (inRangeReservations.length - pricedResv.length);
  const bookingRevenue     = priced.reduce((sum, a) => sum + Number(a.servicePrice || 0), 0);
  const orderRevenue       = inRangeOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const reservationRevenue = pricedResv.reduce((sum, r) => sum + Number(r.totalPrice || 0), 0);
  const totalRevenue       = bookingRevenue + orderRevenue + reservationRevenue;

  const byDay = useMemo(() => {
    const map = {};
    priced.forEach(a => {
      (map[a.date] ||= { date: a.date, bookings: 0, orders: 0, reservations: 0 }).bookings += Number(a.servicePrice || 0);
    });
    inRangeOrders.forEach(o => {
      (map[o._date] ||= { date: o._date, bookings: 0, orders: 0, reservations: 0 }).orders += Number(o.totalAmount || 0);
    });
    pricedResv.forEach(r => {
      (map[r.checkIn] ||= { date: r.checkIn, bookings: 0, orders: 0, reservations: 0 }).reservations += Number(r.totalPrice || 0);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [priced, inRangeOrders, pricedResv]);

  const byBusiness = useMemo(() => {
    const map = {};
    priced.forEach(a => {
      const key = a.businessName || 'Unknown';
      map[key] = (map[key] || 0) + Number(a.servicePrice || 0);
    });
    inRangeOrders.forEach(o => {
      const key = o.businessName || 'Unknown';
      map[key] = (map[key] || 0) + Number(o.totalAmount || 0);
    });
    pricedResv.forEach(r => {
      const key = r.businessName || 'Unknown';
      map[key] = (map[key] || 0) + Number(r.totalPrice || 0);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([business, revenue]) => ({ business, revenue }));
  }, [priced, inRangeOrders, pricedResv]);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Revenue from completed bookings and food orders.</p>
        </div>
      </div>

      <div className="status-filter-tabs" style={{ marginBottom: '1.25rem' }}>
        {PRESETS.map(p => (
          <button key={p.key} className={`status-tab ${preset === p.key ? 'active' : ''}`} onClick={() => setPreset(p.key)}>{p.label}</button>
        ))}
        <button className={`status-tab ${preset === 'custom' ? 'active' : ''}`} onClick={() => setPreset('custom')}>Custom</button>
      </div>

      {preset === 'custom' && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From</label>
              <input type="date" className="form-control" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To</label>
              <input type="date" className="form-control" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-card--green">
              <div className="stat-icon"><Wallet size={20} /></div>
              <div><div className="stat-value">{formatCurrency(totalRevenue)}</div><div className="stat-label">Total revenue</div></div>
            </div>
            <div className="stat-card stat-card--primary">
              <div className="stat-icon"><CalendarCheck size={20} /></div>
              <div><div className="stat-value">{formatCurrency(bookingRevenue)}</div><div className="stat-label">From {formatCompactNumber(priced.length)} bookings</div></div>
            </div>
            <div className="stat-card stat-card--blue">
              <div className="stat-icon"><UtensilsCrossed size={20} /></div>
              <div><div className="stat-value">{formatCurrency(orderRevenue)}</div><div className="stat-label">From {formatCompactNumber(inRangeOrders.length)} food orders</div></div>
            </div>
            <div className="stat-card stat-card--teal">
              <div className="stat-icon"><Hotel size={20} /></div>
              <div><div className="stat-value">{formatCurrency(reservationRevenue)}</div><div className="stat-label">From {formatCompactNumber(pricedResv.length)} reservations</div></div>
            </div>
            {excluded > 0 && (
              <div className="stat-card stat-card--amber">
                <div className="stat-icon"><AlertTriangle size={20} /></div>
                <div><div className="stat-value">{excluded}</div><div className="stat-label">Bookings excluded — no price recorded</div></div>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '1.25rem', padding: '1.5rem 1.5rem 0.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Revenue over time</h3>
            {byDay.length === 0 ? <p className="empty-state">No revenue in this range.</p> : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={byDay} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={{ stroke: CHART_GRID }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} width={48} />
                  <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                  <Area type="monotone" dataKey="bookings" name="Bookings" stackId="revenue" stroke={CHART_COLORS.navy} strokeWidth={2} fill={CHART_COLORS.navy} fillOpacity={0.15} />
                  <Area type="monotone" dataKey="orders" name="Food orders" stackId="revenue" stroke={CHART_COLORS.orange} strokeWidth={2} fill={CHART_COLORS.orange} fillOpacity={0.15} />
                  <Area type="monotone" dataKey="reservations" name="Reservations" stackId="revenue" stroke={CHART_COLORS.teal} strokeWidth={2} fill={CHART_COLORS.teal} fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card" style={{ marginTop: '1.25rem', padding: '1.5rem 1.5rem 0.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Revenue by business</h3>
            {byBusiness.length === 0 ? <p className="empty-state">No revenue in this range.</p> : (
              <ResponsiveContainer width="100%" height={Math.max(160, byBusiness.length * 42)}>
                <BarChart data={byBusiness} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_AXIS }} axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} />
                  <YAxis type="category" dataKey="business" tick={{ fontSize: 12, fill: 'var(--text)' }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip contentStyle={CHART_TOOLTIP} formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill={CHART_COLORS.navy} barSize={20} radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="revenue" position="right" formatter={formatCurrency} style={{ fill: 'var(--text-mid)', fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <DataTable
              rowKey="business"
              columns={[
                { key: 'business', header: 'Business', sortable: true, render: b => b.business },
                { key: 'revenue', header: 'Revenue', sortable: true, render: b => formatCurrency(b.revenue) },
              ]}
              rows={byBusiness}
              emptyMessage="No revenue in this range."
            />
          </div>
        </>
      )}
    </div>
  );
}
