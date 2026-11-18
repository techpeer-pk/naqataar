import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Plus, Calendar, ShoppingBag, ClipboardList, Mail, Phone, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../firebase';
import { useAppointments } from '../../hooks/useAppointments';
import { useOrders } from '../../hooks/useOrders';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { bookingRef, orderRef, formatTime12h, accountRef } from '../../utils/format';
import Modal from '../../components/superadmin/Modal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

function toMillis(ts) {
  if (!ts) return 0;
  return typeof ts.toMillis === 'function' ? ts.toMillis() : ts.seconds ? ts.seconds * 1000 : 0;
}
function toDateStr(ts) {
  const ms = toMillis(ts);
  return ms ? new Date(ms).toLocaleString() : '—';
}

const TABS = [
  { key: 'appointments', label: 'Appointments', icon: Calendar },
  { key: 'orders',       label: 'Orders',       icon: ShoppingBag },
  { key: 'tickets',      label: 'Tickets',       icon: ClipboardList },
];

export default function SubjectDetailPage() {
  const { type, id } = useParams(); // type: 'user' | 'business'
  const navigate = useNavigate();
  const [subject, setSubject]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('appointments');
  const [ticketDraft, setTicketDraft] = useState(null); // null = modal closed
  const [saving, setSaving]     = useState(false);

  const { appointments, loading: apptsLoading, fetchByBusiness: fetchApptsByBusiness, fetchByEmail: fetchApptsByEmail } = useAppointments();
  const { orders, loading: ordersLoading, fetchByBusiness: fetchOrdersByBusiness, fetchByEmail: fetchOrdersByEmail } = useOrders();
  const { create: createTicket, fetchBySubject } = useSupportTickets();
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const reloadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      setTickets(await fetchBySubject(id));
    } finally {
      setTicketsLoading(false);
    }
  }, [id, fetchBySubject]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, type === 'user' ? 'users' : 'businesses', id));
      if (cancelled) return;
      const data = snap.exists() ? { id: snap.id, ...snap.data() } : null;
      setSubject(data);
      setLoading(false);
      if (!data) return;
      if (type === 'user') {
        if (data.email) { fetchApptsByEmail(data.email); fetchOrdersByEmail(data.email); }
      } else {
        fetchApptsByBusiness(id);
        fetchOrdersByBusiness(id);
      }
      reloadTickets();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  const openTicket = (related = { relatedType: 'none', relatedId: null }) => {
    setTicketDraft({
      reason: '', channel: 'call', notes: '',
      relatedType: related.relatedType, relatedId: related.relatedId,
    });
  };

  const saveTicket = async (e) => {
    e.preventDefault();
    if (!subject) return;
    setSaving(true);
    try {
      await createTicket({
        subjectType: type,
        subjectId: id,
        subjectSnapshot: {
          name: subject.displayName || subject.name || '',
          phone: subject.phone || '',
          email: subject.email || '',
        },
        relatedType: ticketDraft.relatedType,
        relatedId: ticketDraft.relatedId,
        channel: ticketDraft.channel,
        reason: ticketDraft.reason.trim(),
        notes: ticketDraft.notes.trim(),
      });
      toast.success('Ticket logged.');
      setTicketDraft(null);
      reloadTickets();
    } catch {
      toast.error('Could not save ticket.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ marginTop: '1rem' }}><Sk h="120px" r="12px" /></div>;
  }

  if (!subject) {
    return (
      <div className="empty-state">
        <p>Not found.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/qufreecrm')}><ArrowLeft size={14} /> Back to Lookup</button>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/qufreecrm')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={14} /> Back to Lookup
      </button>

      <div className="dashboard-header">
        <div>
          <h1>{subject.displayName || subject.name || '—'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {subject.email && <span><Mail size={13} style={{ verticalAlign: '-2px' }} /> {subject.email}</span>}
            {subject.phone && <span><Phone size={13} style={{ verticalAlign: '-2px' }} /> {subject.phone}</span>}
            {type === 'business' && <span className="badge badge-clinic">{subject.type}</span>}
            {type === 'user' && <span className="badge badge-confirmed">{subject.role || 'customer'}</span>}
            {type === 'user' && (
              <span className="badge badge-confirmed" title="Ask the caller to read this out to verify it's really them">
                Support ID: {accountRef(subject.id)}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span className="booking-ref-cell">{subject.id}</span>
              <button className="btn btn-ghost btn-sm" style={{ padding: '0.2rem' }}
                onClick={() => { navigator.clipboard.writeText(subject.id); toast.success('ID copied.'); }}
                title={type === 'user' ? 'Copy UID' : 'Copy Business ID'}>
                <Copy size={12} />
              </button>
            </span>
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => openTicket()}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      <div className="appt-filters card" style={{ marginTop: '1rem' }}>
        <div className="card-body appt-filters-inner">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(key)}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {tab === 'appointments' && (
          apptsLoading ? <Sk h="52px" r="10px" /> : appointments.length === 0 ? (
            <div className="empty-state"><p>No appointments.</p></div>
          ) : (
            <div className="appt-table card">
              <table>
                <thead><tr><th>Ref</th><th>Business</th><th>Date</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a.id}>
                      <td className="booking-ref-cell">{bookingRef(a.id)}</td>
                      <td>{a.businessName || a.businessId}</td>
                      <td>{a.date} {formatTime12h(a.time)}</td>
                      <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openTicket({ relatedType: 'appointment', relatedId: a.id })}>
                          <Plus size={13} /> Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'orders' && (
          ordersLoading ? <Sk h="52px" r="10px" /> : orders.length === 0 ? (
            <div className="empty-state"><p>No orders.</p></div>
          ) : (
            <div className="appt-table card">
              <table>
                <thead><tr><th>Ref</th><th>Business</th><th>Placed</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td className="booking-ref-cell">{orderRef(o.id)}</td>
                      <td>{o.businessName || o.businessId}</td>
                      <td>{toDateStr(o.createdAt)}</td>
                      <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openTicket({ relatedType: 'order', relatedId: o.id })}>
                          <Plus size={13} /> Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'tickets' && (
          ticketsLoading ? <Sk h="52px" r="10px" /> : tickets.length === 0 ? (
            <div className="empty-state"><p>No tickets yet.</p></div>
          ) : (
            <div className="appt-table card">
              <table>
                <thead><tr><th>Reason</th><th>Channel</th><th>Status</th><th>Logged</th><th></th></tr></thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id} className="sa-row-clickable" onClick={() => navigate(`/qufreecrm/tickets/${t.id}`)}>
                      <td>{t.reason || '—'}</td>
                      <td>{t.channel}</td>
                      <td><span className={`badge badge-${t.status === 'open' ? 'pending' : t.status === 'escalated' ? 'cancelled' : 'confirmed'}`}>{t.status}</span></td>
                      <td>{toDateStr(t.createdAt)}</td>
                      <td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <Modal open={!!ticketDraft} onClose={() => setTicketDraft(null)} title="New Support Ticket">
        {ticketDraft && (
          <form onSubmit={saveTicket}>
            {ticketDraft.relatedType !== 'none' && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Linked to {ticketDraft.relatedType} <code>{ticketDraft.relatedId}</code>
              </p>
            )}
            <div className="form-group">
              <label className="form-label">Channel</label>
              <select className="form-control" value={ticketDraft.channel}
                onChange={e => setTicketDraft(d => ({ ...d, channel: e.target.value }))}>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="walk_in">Walk-in</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <input className="form-control" required value={ticketDraft.reason}
                onChange={e => setTicketDraft(d => ({ ...d, reason: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={4} value={ticketDraft.notes}
                onChange={e => setTicketDraft(d => ({ ...d, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setTicketDraft(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Ticket'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
