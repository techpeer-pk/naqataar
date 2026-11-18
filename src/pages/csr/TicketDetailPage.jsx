import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupportTickets } from '../../hooks/useSupportTickets';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
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
// <input type="datetime-local"> <-> Firestore Timestamp
function toLocalInputValue(ts) {
  const ms = toMillis(ts);
  if (!ms) return '';
  const d = new Date(ms - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchOne, update } = useSupportTickets();
  const [ticket, setTicket]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes]     = useState('');
  const [followUp, setFollowUp] = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const t = await fetchOne(id);
      setTicket(t);
      setNotes(t?.notes || '');
      setFollowUp(toLocalInputValue(t?.followUpAt));
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveNotes = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { notes: notes.trim() };
      data.followUpAt = followUp ? Timestamp.fromDate(new Date(followUp)) : null;
      await update(id, data);
      setTicket(prev => ({ ...prev, ...data }));
      toast.success('Ticket updated.');
    } catch {
      toast.error('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status) => {
    setSaving(true);
    try {
      const data = { status };
      if (status === 'resolved') data.resolvedAt = serverTimestamp();
      await update(id, data);
      setTicket(prev => ({ ...prev, ...data }));
      toast.success(`Ticket marked ${status}.`);
    } catch {
      toast.error('Update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ marginTop: '1rem' }}><Sk h="200px" r="12px" /></div>;

  if (!ticket) {
    return (
      <div className="empty-state">
        <p>Ticket not found.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/qufreecrm/tickets')}><ArrowLeft size={14} /> Back to Tickets</button>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/qufreecrm/tickets')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={14} /> Back to Tickets
      </button>

      <div className="dashboard-header">
        <div>
          <h1>{ticket.reason || 'Support ticket'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <Link to={`/qufreecrm/subject/${ticket.subjectType}/${ticket.subjectId}`}>{ticket.subjectSnapshot?.name || ticket.subjectId}</Link>
            {' · '}{ticket.channel}{' · '}logged {toDateStr(ticket.createdAt)}
            {ticket.relatedType && ticket.relatedType !== 'none' && <> · linked {ticket.relatedType} <code>{ticket.relatedId}</code></>}
          </p>
        </div>
        <span className={`badge badge-${ticket.status === 'open' ? 'pending' : ticket.status === 'escalated' ? 'cancelled' : 'confirmed'}`}>{ticket.status}</span>
      </div>

      <form onSubmit={saveNotes} className="card" style={{ marginTop: '1rem' }}>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={6} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-up</label>
            <input className="form-control" type="datetime-local" value={followUp} onChange={e => setFollowUp(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> Save</button>
            {ticket.status !== 'resolved' && (
              <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setStatus('resolved')}>
                <CheckCircle size={16} /> Mark Resolved
              </button>
            )}
            {ticket.status !== 'escalated' && (
              <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setStatus('escalated')}>
                <AlertTriangle size={16} /> Escalate
              </button>
            )}
            {ticket.status !== 'open' && (
              <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setStatus('open')}>
                Reopen
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
