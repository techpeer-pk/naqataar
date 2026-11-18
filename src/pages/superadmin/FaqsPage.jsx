import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFaqs } from '../../hooks/useFaqs';
import { useAuditLog } from '../../hooks/useAuditLog';
import { filterBySearch } from '../../utils/search';
import DataTable from '../../components/superadmin/DataTable';
import Modal from '../../components/superadmin/Modal';
import Sk from '../../components/shared/Skeleton';
import '../admin/AppointmentsPage.css';

const AUDIENCES = ['all', 'customer', 'businessAdmin'];
const AUDIENCE_LABEL = { all: 'Everyone', customer: 'Customer', businessAdmin: 'Business Admin' };
const AUDIENCE_BADGE = { all: 'badge-completed', customer: 'badge-clinic', businessAdmin: 'badge-staff' };
const EMPTY_FORM = { question: '', answer: '', audience: 'all', category: '', order: 0, active: true };

export default function FaqsPage() {
  const { faqs, loading, fetchAll, create, update, remove } = useFaqs();
  const { log } = useAuditLog();

  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const displayed = useMemo(() => {
    let list = filterBySearch(faqs, search, ['question', 'answer', 'category']);
    if (audienceFilter !== 'all') list = list.filter(f => f.audience === audienceFilter);
    return list;
  }, [faqs, search, audienceFilter]);

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (faq) => {
    setEditingId(faq.id);
    setForm({
      question: faq.question || '',
      answer: faq.answer || '',
      audience: faq.audience || 'all',
      category: faq.category || '',
      order: faq.order ?? 0,
      active: faq.active !== false,
    });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        audience: form.audience,
        category: form.category.trim(),
        order: Number(form.order) || 0,
        active: form.active,
      };
      if (editingId) {
        await update(editingId, data);
        await log({ action: 'update', targetCollection: 'faqs', docId: editingId, summary: data.question });
        toast.success('FAQ updated.');
      } else {
        const id = await create(data);
        await log({ action: 'create', targetCollection: 'faqs', docId: id, summary: data.question });
        toast.success('FAQ created.');
      }
      closeForm();
    } catch {
      toast.error('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (faq) => {
    if (!window.confirm(`Delete "${faq.question}"?`)) return;
    try {
      await remove(faq.id);
      await log({ action: 'delete', targetCollection: 'faqs', docId: faq.id, summary: faq.question });
      toast.success('FAQ deleted.');
    } catch {
      toast.error('Delete failed.');
    }
  };

  const columns = [
    { key: 'question', header: 'Question', sortable: true, render: f => (
      <>
        <p className="customer-name">{f.question}</p>
        {f.category && <p className="customer-contact">{f.category}</p>}
      </>
    ) },
    { key: 'audience', header: 'Audience', sortable: true, render: f => (
      <span className={`badge ${AUDIENCE_BADGE[f.audience] || 'badge-completed'}`}>{AUDIENCE_LABEL[f.audience] || f.audience}</span>
    ) },
    { key: 'order', header: 'Order', sortable: true },
    { key: 'active', header: 'Status', sortable: true, sortValue: f => (f.active !== false ? 1 : 0), render: f => (
      <span className={`badge ${f.active !== false ? 'badge-confirmed' : 'badge-cancelled'}`}>{f.active !== false ? 'Active' : 'Inactive'}</span>
    ) },
    { key: 'delete', header: '', stopRowClick: true, render: f => (
      <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} onClick={() => handleDelete(f)} title="Delete">
        <Trash2 size={14} />
      </button>
    ) },
  ];

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>FAQs</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{displayed.length} of {faqs.length} — shown in the support chat widget.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate} title="Add FAQ"><Plus size={16} /></button>
      </div>

      <div className="appt-filters card">
        <div className="card-body appt-filters-inner">
          <div className="input-icon-wrap" style={{ maxWidth: '280px' }}>
            <Search size={16} className="input-icon" />
            <input className="form-control input-with-icon" placeholder="Search question, answer, category…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 'auto' }} value={audienceFilter} onChange={e => setAudienceFilter(e.target.value)}>
            <option value="all">All audiences</option>
            {AUDIENCES.map(a => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
          </select>
        </div>
      </div>

      {loading && faqs.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => <Sk key={i} h="52px" r="10px" />)}
        </div>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <DataTable
            columns={columns}
            rows={displayed}
            emptyMessage="No FAQs yet."
            onRowClick={openEdit}
          />
        </div>
      )}

      <Modal open={showForm} onClose={closeForm} title={editingId ? 'Edit FAQ' : 'Add FAQ'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Question *</label>
            <input className="form-control" value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Answer *</label>
            <textarea className="form-control" rows={4} value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} required />
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Audience</label>
              <select className="form-control" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
                {AUDIENCES.map(a => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="form-control" placeholder="e.g. Booking" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label">Order</label>
              <input className="form-control" type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-control" value={form.active ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, active: e.target.value === 'active' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} title="Save FAQ">
              <Save size={16} />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
