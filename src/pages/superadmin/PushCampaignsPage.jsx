import { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePushCampaigns } from '../../hooks/usePushCampaigns';
import { usePushTokens } from '../../hooks/usePushTokens';
import { useAuditLog } from '../../hooks/useAuditLog';
import DataTable from '../../components/superadmin/DataTable';
import Modal from '../../components/superadmin/Modal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const EMPTY_FORM = { title: '', body: '', url: '' };
const STATUS_BADGE = { done: 'badge-confirmed', error: 'badge-cancelled' };
const STATUS_LABEL = { done: 'Done', error: 'Error' };

export default function PushCampaignsPage() {
  const { campaigns, loading, send } = usePushCampaigns();
  const { tokens, loading: tokensLoading } = usePushTokens();
  const { log } = useAuditLog();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);

  const openCreate = () => { setForm(EMPTY_FORM); setShowForm(true); };
  const closeForm = () => setShowForm(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const data = { title: form.title.trim(), body: form.body.trim(), url: form.url.trim() };
      const id = await send(data);
      await log({ action: 'create', targetCollection: 'pushCampaigns', docId: id, summary: data.title });
      toast.success('Broadcast queued.');
      closeForm();
    } catch {
      toast.error('Send failed.');
    } finally {
      setSending(false);
    }
  };

  const tokenColumns = [
    { key: 'email', header: 'Email', sortable: true, render: t => (
      <>
        <p className="customer-name">{t.email || (t.uid ? 'Unknown user' : 'Guest')}</p>
        <p className="customer-contact">uid: {t.uid || '—'}</p>
        <p className="customer-contact">token: {t.id.slice(0, 24)}…</p>
      </>
    ) },
    { key: 'userAgent', header: 'Device', render: t => t.userAgent || '—' },
    { key: 'lastSeenAt', header: 'Last Seen', sortable: true, sortValue: t => t.lastSeenAt?.toMillis?.() ?? 0, render: t => t.lastSeenAt?.toDate ? t.lastSeenAt.toDate().toLocaleString() : '—' },
  ];

  const columns = [
    { key: 'title', header: 'Title', sortable: true, render: c => (
      <>
        <p className="customer-name">{c.title}</p>
        {c.body && <p className="customer-contact">{c.body}</p>}
      </>
    ) },
    { key: 'status', header: 'Status', sortable: true, render: c => (
      <span className={`badge ${STATUS_BADGE[c.status] || 'badge-staff'}`}>{STATUS_LABEL[c.status] || 'Sending…'}</span>
    ) },
    { key: 'sent', header: 'Sent', sortable: true, render: c => c.sent ?? '—' },
    { key: 'failed', header: 'Failed', sortable: true, render: c => c.failed ?? '—' },
    { key: 'createdAt', header: 'Created', sortable: true, render: c => c.createdAt?.toDate ? c.createdAt.toDate().toLocaleString() : '—' },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Push Campaigns</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Broadcasts a data-only push to every registered device in pushTokens.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate} title="New broadcast"><Plus size={16} /></button>
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>Registered Devices</h2>
      {tokensLoading && tokens.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable columns={tokenColumns} rows={tokens} emptyMessage="No devices registered yet." />
        </div>
      )}

      <h2 style={{ marginTop: '2rem' }}>Campaigns</h2>
      {loading && campaigns.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable columns={columns} rows={campaigns} emptyMessage="No broadcasts sent yet." />
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title="New Broadcast">
        <form onSubmit={handleSend}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Body</label>
            <textarea className="form-control" rows={3} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">URL</label>
            <input className="form-control" placeholder="/index" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending} title="Send">
              <Send size={16} />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
