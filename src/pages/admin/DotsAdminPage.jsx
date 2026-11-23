import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Ticket, Check, SkipForward, Copy, Phone, /* Undo2, */ Lock, Unlock, Search, X } from 'lucide-react';
import { db } from '../../firebase';
import { useOwnBusiness } from '../../hooks/useOwnBusiness';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useBusy } from '../../context/BusyContext';
import ClinicQrCard from '../../components/shared/ClinicQrCard';
import {
  queueRef, tokenRef, mobileLockRef, todayPKT, shortCode, MAX_TOKEN_OPTIONS, MAX_TOKENS_LIMIT,
} from '../../utils/dots';
import { t } from '../../i18n';
import './DotsAdminPage.css';

// Clinic owner's token queue for today: start it (max tokens), call the next
// patient (Served / Skip), close it. The queue resets every day by itself
// (one Firestore doc per date).

export default function DotsAdminPage() {
  const { business, loading } = useOwnBusiness();
  const { withBusy } = useBusy();
  const today = todayPKT();
  const [queue, setQueue]   = useState(undefined);
  const [tokens, setTokens] = useState([]);
  const [maxPick, setMaxPick] = useState(100);
  const [editMax, setEditMax] = useState(null); // null = not editing
  const [search, setSearch]   = useState('');

  usePageTitle(t('Token Queue'));

  const bizId = business?.id;
  useEffect(() => {
    if (!bizId) return;
    return onSnapshot(queueRef(db, bizId, today), s => setQueue(s.exists() ? s.data() : null), () => setQueue(null));
  }, [bizId, today]);

  useEffect(() => {
    if (!bizId || !queue) { setTokens([]); return; }
    const q = query(collection(db, 'businesses', bizId, 'dotsTokens'), where('date', '==', today));
    return onSnapshot(q, s => setTokens(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setTokens([]));
  }, [bizId, today, !!queue]);

  const waiting = useMemo(() => tokens.filter(x => x.status === 'waiting').sort((a, b) => a.seq - b.seq), [tokens]);
  const done    = useMemo(() => tokens.filter(x => x.status !== 'waiting').sort((a, b) => b.seq - a.seq), [tokens]);
  const current = waiting[0] || null;

  // Search by token number ("12" or "#12"), name, or the 6-char code.
  const term = search.trim().toLowerCase().replace(/^#/, '');
  const results = useMemo(() => {
    if (!term) return [];
    return tokens.filter(x =>
      (/^\d+$/.test(term) ? String(x.seq) === term : false)
      || x.name.toLowerCase().includes(term)
      || shortCode(x.id).toLowerCase().includes(term)
    ).sort((a, b) => a.seq - b.seq);
  }, [tokens, term]);

  // Customers see queue.nowServing — keep it on the token at the counter.
  const wantServing = current?.seq ?? 0;
  useEffect(() => {
    if (!bizId || !queue || queue.nowServing === wantServing || wantServing > queue.lastToken) return;
    updateDoc(queueRef(db, bizId, today), { nowServing: wantServing, updatedAt: serverTimestamp() }).catch(() => {});
  }, [bizId, today, queue?.nowServing, queue?.lastToken, wantServing]);

  const publicLink = bizId ? `${window.location.origin}/index/businessDOTS/${bizId}` : '';

  const run = async (fn, okMsg) => {
    try {
      await withBusy(fn);
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (e) {
      console.error(e);
      toast.error(t('Something went wrong. Please try again.'));
      return false;
    }
  };

  const startQueue = () => {
    const n = Number(maxPick);
    if (!Number.isInteger(n) || n < 1 || n > MAX_TOKENS_LIMIT) {
      toast.error(t('Max tokens must be between 1 and {max}', { max: MAX_TOKENS_LIMIT }));
      return;
    }
    run(() => setDoc(queueRef(db, bizId, today), {
      date: today, maxTokens: n, lastToken: 0, nowServing: 0, isOpen: true,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }), t('Today\'s queue started'));
  };

  // Served / Skip frees the mobile lock so that customer can take a new
  // token; 'waiting' (the "Back to queue" undo, now commented out) puts it back.
  const setStatus = (tok, status) => run(() => {
    const b = writeBatch(db);
    b.update(tokenRef(db, bizId, tok.id), { status, updatedAt: serverTimestamp() });
    const lock = mobileLockRef(db, bizId, tok.date, tok.mobile);
    if (status === 'waiting') b.set(lock, { createdAt: serverTimestamp() });
    else b.delete(lock);
    return b.commit();
  });

  const toggleOpen = () =>
    run(() => updateDoc(queueRef(db, bizId, today), { isOpen: !queue.isOpen, updatedAt: serverTimestamp() }));

  const saveMax = () => {
    const n = Number(editMax);
    if (!Number.isInteger(n) || n < Math.max(1, queue.lastToken) || n > MAX_TOKENS_LIMIT) {
      toast.error(t('Max tokens must be between {min} and {max}', { min: Math.max(1, queue.lastToken), max: MAX_TOKENS_LIMIT }));
      return;
    }
    run(() => updateDoc(queueRef(db, bizId, today), { maxTokens: n, updatedAt: serverTimestamp() }))
      .then(ok => { if (ok) setEditMax(null); });
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicLink); toast.success(t('Link copied')); }
    catch { toast.error(t('Could not copy the link')); }
  };

  const statusBadge = x => x.status === 'waiting'
    ? <span className="badge badge-pending">{t('Waiting')}</span>
    : <span className={`badge ${x.status === 'served' ? 'badge-completed' : 'badge-cancelled'}`}>
        {x.status === 'served' ? t('Served') : t('Skipped')}
      </span>;

  const tokenRow = (x, { badge = false } = {}) => (
    <li key={x.id} className={x.status === 'waiting' ? '' : 'is-done'}>
      <span className="dotsa-seq">#{x.seq}</span>
      <span className="dotsa-li-name">{x.name}<small>{x.mobile} · …{shortCode(x.id)}</small></span>
      {(badge || x.status !== 'waiting') && statusBadge(x)}
      {x.status === 'waiting' && (
        <>
          <button className="btn btn-ghost btn-sm" onClick={() => setStatus(x, 'served')} title={t('Served')} aria-label={t('Served')}><Check size={15} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setStatus(x, 'skipped')} title={t('Skip token')} aria-label={t('Skip token')}><SkipForward size={15} /></button>
        </>
      )}
      {/* Skip undo ("Back to queue") — switched off 2026-11-23. A skipped
          customer takes a new token instead. To bring it back, un-comment
          this and Undo2 in the lucide import; setStatus(x, 'waiting')
          already puts the mobile lock back.
      {x.status === 'skipped' && (
        <button className="btn btn-ghost btn-sm" onClick={() => setStatus(x, 'waiting')} title={t('Back to queue')} aria-label={t('Back to queue')}><Undo2 size={15} /></button>
      )} */}
    </li>
  );

  if (loading || (bizId && queue === undefined)) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }
  if (!business) {
    return <div className="admin-layout page"><div className="container"><p>{t('Clinic not found.')}</p></div></div>;
  }

  return (
    <div className="admin-layout page">
      <div className="container dotsa">
        <div className="dotsa-header">
          <h1><Ticket size={22} /> {t('Token Queue')}</h1>
          <span className="dotsa-date">{t('Today')}: {today}</span>
        </div>

        {!business.isActive && (
          <p className="dotsa-warn">{t('Your clinic is waiting for approval. Customers can take tokens after approval.')}</p>
        )}

        {/* Token poster: QR straight to this clinic's token page */}
        <ClinicQrCard business={business} variant="token" />

        {/* Customer link */}
        <div className="card dotsa-link">
          <div className="card-body">
            <span className="form-label">{t('Customer link for tokens')}</span>
            <div className="dotsa-link-row">
              <code>{publicLink}</code>
              <button className="btn btn-secondary btn-sm" onClick={copyLink}><Copy size={14} /> {t('Copy')}</button>
            </div>
          </div>
        </div>

        {!queue ? (
          <div className="card">
            <div className="card-body">
              <h3 className="dotsa-h3">{t('Start today\'s queue')}</h3>
              <span className="form-label">{t('Max tokens')}</span>
              <div className="dotsa-chips">
                {MAX_TOKEN_OPTIONS.map(n => (
                  <button key={n} type="button" className={`dotsa-chip ${Number(maxPick) === n ? 'active' : ''}`} onClick={() => setMaxPick(n)}>{n}</button>
                ))}
                <input className="form-control dotsa-num" type="number" min={1} max={MAX_TOKENS_LIMIT}
                  aria-label={t('Max tokens')} value={maxPick} onChange={e => setMaxPick(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-full" onClick={startQueue}>{t('Start Queue')}</button>
              <p className="form-hint">{t('The queue resets every day. Start it again tomorrow.')}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="dotsa-stats">
              <div><span>{t('Issued')}</span><strong>{queue.lastToken} / {queue.maxTokens}</strong></div>
              <div><span>{t('Waiting')}</span><strong>{waiting.length}</strong></div>
              <div><span>{t('Status')}</span><strong className={queue.isOpen ? 'ok' : 'off'}>{queue.isOpen ? t('Open') : t('Closed')}</strong></div>
            </div>

            <div className="dotsa-controls">
              <button className="btn btn-secondary btn-sm" onClick={toggleOpen}>
                {queue.isOpen ? <><Lock size={14} /> {t('Close queue')}</> : <><Unlock size={14} /> {t('Open queue')}</>}
              </button>
              {editMax === null ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditMax(queue.maxTokens)}>{t('Change max tokens')}</button>
              ) : (
                <span className="dotsa-maxedit">
                  <input className="form-control dotsa-num" type="number" min={Math.max(1, queue.lastToken)} max={MAX_TOKENS_LIMIT}
                    aria-label={t('Max tokens')} value={editMax} onChange={e => setEditMax(e.target.value)} />
                  <button className="btn btn-primary btn-sm" onClick={saveMax}>{t('Save')}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditMax(null)}>{t('Cancel')}</button>
                </span>
              )}
            </div>

            <div className="dotsa-search">
              <Search size={16} aria-hidden="true" />
              <input className="form-control" type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('Search by token # or name')} aria-label={t('Search by token # or name')} />
              {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')} aria-label={t('Clear')}><X size={15} /></button>}
            </div>

            {term ? (
              <div className="card">
                <div className="card-header"><h3>{t('Search results')} ({results.length})</h3></div>
                {results.length
                  ? <ul className="dotsa-list">{results.map(x => tokenRow(x, { badge: true }))}</ul>
                  : <div className="card-body dotsa-empty">{t('No token found.')}</div>}
              </div>
            ) : (
            <>
            {/* Token at the counter */}
            <div className="card dotsa-current">
              {current ? (
                <div className="card-body">
                  <span className="dotsa-label">{t('Now serving')}</span>
                  <div className="dotsa-number">#{current.seq}</div>
                  <div className="dotsa-who">
                    <b>{current.name}</b>
                    <a href={`tel:${current.mobile}`}><Phone size={13} /> {current.mobile}</a>
                    <span className="dotsa-code">{t('Code')}: …{shortCode(current.id)}</span>
                  </div>
                  <div className="dotsa-actions">
                    <button className="btn btn-primary" onClick={() => setStatus(current, 'served')}><Check size={16} /> {t('Served')}</button>
                    <button className="btn btn-secondary" onClick={() => setStatus(current, 'skipped')}><SkipForward size={16} /> {t('Skip token')}</button>
                  </div>
                </div>
              ) : (
                <div className="card-body dotsa-empty">{t('No one is waiting right now.')}</div>
              )}
            </div>

            {waiting.length > 1 && (
              <div className="card">
                <div className="card-header"><h3>{t('Next in line')}</h3></div>
                <ul className="dotsa-list">{waiting.slice(1).map(x => tokenRow(x))}</ul>
              </div>
            )}

            {done.length > 0 && (
              <div className="card">
                <div className="card-header"><h3>{t('Done')}</h3></div>
                <ul className="dotsa-list">{done.map(x => tokenRow(x))}</ul>
              </div>
            )}
            </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
