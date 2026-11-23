import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Ticket, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '../../firebase';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useBusy } from '../../context/BusyContext';
import {
  issueToken, queueRef, tokenRef, todayPKT, shortCode, savedTokenKey, TOKEN_ID_RE,
} from '../../utils/dots';
import { t } from '../../i18n';
import './DotsPage.css';

// /index/businessDOTS/:businessId           → take a token (name + mobile, no login)
// /index/businessDOTS/:businessId/:tokenId  → this customer's live token

const ERRORS = {
  closed: 'Token queue is closed today.',
  full: 'All tokens for today are taken.',
  duplicate: 'This mobile number already has a token in the queue. Please contact the clinic counter.',
  'invalid-name': 'Please enter your full name.',
  'invalid-mobile': 'Enter a valid mobile number, e.g. 0300-1234567',
};

function readSaved(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeSaved(key, val) {
  try { localStorage.setItem(key, val); } catch { /* private mode: link still works */ }
}

export default function DotsPage() {
  const { businessId, tokenId } = useParams();
  const navigate = useNavigate();
  const { withBusy } = useBusy();
  const today = todayPKT();

  const [biz, setBiz]     = useState(undefined); // undefined = loading, null = not found
  const [token, setToken] = useState(undefined);
  const [queue, setQueue] = useState(undefined);
  const [form, setForm]   = useState({ name: '', mobile: '' });
  const [error, setError] = useState('');

  usePageTitle(t('Online Token'));

  useEffect(() => {
    getDoc(doc(db, 'businesses', businessId))
      .then(s => setBiz(s.exists() ? { id: s.id, ...s.data() } : null))
      .catch(() => setBiz(null));
  }, [businessId]);

  // Came back to the form while this device already holds today's token → show it.
  useEffect(() => {
    if (tokenId) return;
    const saved = readSaved(savedTokenKey(businessId, today));
    if (saved && TOKEN_ID_RE.test(saved)) navigate(`/index/businessDOTS/${businessId}/${saved}`, { replace: true });
  }, [businessId, tokenId, today, navigate]);

  useEffect(() => {
    if (!tokenId) { setToken(undefined); return; }
    if (!TOKEN_ID_RE.test(tokenId)) { setToken(null); return; }
    return onSnapshot(tokenRef(db, businessId, tokenId),
      s => setToken(s.exists() ? { id: s.id, ...s.data() } : null),
      () => setToken(null));
  }, [businessId, tokenId]);

  const queueDate = tokenId ? token?.date : today;
  useEffect(() => {
    if (!queueDate) return;
    return onSnapshot(queueRef(db, businessId, queueDate),
      s => setQueue(s.exists() ? s.data() : null),
      () => setQueue(null));
  }, [businessId, queueDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await withBusy(() => issueToken(db, businessId, form));
      writeSaved(savedTokenKey(businessId, res.date), res.tokenId);
      navigate(`/index/businessDOTS/${businessId}/${res.tokenId}`, { replace: true });
    } catch (err) {
      setError(t(ERRORS[err.code] || 'Could not get a token. Please try again.'));
    }
  };

  // After the clinic marks this token Served / Skipped the customer may take a new one.
  const takeNew = () => {
    try { localStorage.removeItem(savedTokenKey(businessId, today)); } catch { /* ignore */ }
    navigate(`/index/businessDOTS/${businessId}`, { replace: true });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t('Link copied'));
    } catch {
      toast.error(t('Could not copy the link'));
    }
  };

  if (biz === undefined || (tokenId && token === undefined) || (queueDate && queue === undefined)) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (!biz) {
    return (
      <div className="page dots-page"><div className="container dots-wrap">
        <div className="card dots-card dots-empty"><AlertCircle size={28} /><p>{t('Clinic not found.')}</p></div>
      </div></div>
    );
  }

  const header = (
    <div className="dots-head">
      <Ticket size={22} />
      <div>
        <h1>{biz.name}</h1>
        <p>{t('Online Token')}</p>
      </div>
    </div>
  );

  const stats = queue && (
    <div className="dots-stats">
      <div><span>{t('Now serving')}</span><strong>{queue.nowServing ? `#${queue.nowServing}` : '—'}</strong></div>
      <div><span>{t('Last token issued')}</span><strong>{queue.lastToken ? `#${queue.lastToken}` : '—'}</strong></div>
    </div>
  );

  // ── Token view ──
  if (tokenId) {
    if (!token) {
      return (
        <div className="page dots-page"><div className="container dots-wrap">
          {header}
          <div className="card dots-card dots-empty">
            <AlertCircle size={28} />
            <p>{t('Token not found. Please check the link.')}</p>
            <button className="btn btn-secondary" onClick={() => navigate(`/index/businessDOTS/${businessId}`)}>{t('Get a new token')}</button>
          </div>
        </div></div>
      );
    }
    const isOld = token.date !== today;
    const myTurn = token.status === 'waiting' && queue?.nowServing === token.seq;
    const ahead = token.status === 'waiting' && queue?.nowServing > 0 && token.seq > queue.nowServing
      ? token.seq - queue.nowServing : null;

    return (
      <div className="page dots-page"><div className="container dots-wrap">
        {header}
        <div className={`card dots-card dots-token ${myTurn ? 'is-turn' : ''}`}>
          <span className="dots-label">{t('Your token')}</span>
          <div className="dots-number">#{token.seq}</div>
          <div className="dots-code">{t('Code')}: <b>…{shortCode(token.id)}</b></div>
          <div className="dots-name">{token.name}</div>

          {isOld && <p className="dots-note">{t('This token was for {date}.', { date: token.date })}</p>}
          {!isOld && token.status === 'waiting' && (
            myTurn
              ? <p className="dots-status turn"><CheckCircle2 size={18} /> {t('It is your turn! Please come to the counter.')}</p>
              : <p className="dots-status">{ahead != null
                  ? t('{n} people ahead of you', { n: ahead })
                  : t('Please wait, you will be called soon.')}</p>
          )}
          {token.status === 'served' && <p className="dots-status done"><CheckCircle2 size={18} /> {t('Done. Thank you!')}</p>}
          {token.status === 'skipped' && <p className="dots-status skipped">{t('Your number was skipped. Please contact the counter.')}</p>}
        </div>
        {!isOld && stats}
        {(isOld || token.status !== 'waiting')
          ? <button className="btn btn-primary btn-full" onClick={takeNew}><Ticket size={16} /> {t('Get a new token')}</button>
          : <button className="btn btn-secondary btn-full" onClick={copyLink}><Copy size={16} /> {t('Copy token link')}</button>}
        <p className="dots-hint">{t('Save this page or take a screenshot. It updates by itself.')}</p>
      </div></div>
    );
  }

  // ── Take-a-token form ──
  const closed = !queue || !queue.isOpen || !biz.isActive;
  const full = queue && queue.lastToken >= queue.maxTokens;

  return (
    <div className="page dots-page"><div className="container dots-wrap">
      {header}
      {stats}
      {closed ? (
        <div className="card dots-card dots-empty"><AlertCircle size={28} /><p>{t(ERRORS.closed)}</p></div>
      ) : full ? (
        <div className="card dots-card dots-empty"><AlertCircle size={28} /><p>{t(ERRORS.full)}</p></div>
      ) : (
        <form className="card dots-card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="dots-name">{t('Full Name')}</label>
            <input id="dots-name" className="form-control" autoComplete="name" maxLength={60} required
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dots-mobile">{t('Mobile Number')}</label>
            <input id="dots-mobile" className="form-control" type="tel" inputMode="tel" autoComplete="tel"
              placeholder="0300-1234567" required
              value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} />
          </div>
          {error && <p className="dots-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full"><Ticket size={16} /> {t('Get Token')}</button>
          <p className="dots-hint">{t('{n} tokens left today', { n: queue.maxTokens - queue.lastToken })}</p>
        </form>
      )}
    </div></div>
  );
}
