import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import EmailTypoHint from '../../components/shared/EmailTypoHint';
import { isValidLocalPhoneDigits, toFullPhone, PH_LOCAL_PHONE_LEN } from '../../utils/validation';
import LegalModal from '../../components/shared/LegalModal';
import '../admin/AdminAuth.css';

export default function CustomerRegister() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null); // 'terms' | 'privacy' | null — LegalModal

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidLocalPhoneDigits(form.phone)) {
      toast.error(`Please enter a valid ${PH_LOCAL_PHONE_LEN}-digit phone number.`);
      return;
    }
    setLoading(true);
    try {
      // await register(form.email, form.password, form.name, form.phone, 'customer');
      await register(form.email, form.password, form.name, toFullPhone(form.phone), 'customer');
      toast.success('Account created!');
      navigate('/index/my-appointments');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use')
        toast.error('Email already registered. Please sign in.');
      else
        toast.error('Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card fade-up">
        <div className="auth-brand">
          {/* <img src="/qunjee-logo.png" alt="Qunjee" className="auth-logo-img" /> */}
          {/* <img src="/qufree-logo.png" alt="Qufree" className="auth-logo-img" /> */}
          <img src="/brand/naqatar-lockup.png" alt="Naqatar" className="auth-logo-img" width={522} height={160} />
          <span className="auth-brand-tag">Customer</span>
        </div>

        <h1 className="auth-title">Create Account</h1>
        <p className="auth-sub">Sign up to track all your bookings in one place.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-icon-wrap">
              <User size={16} className="input-icon" />
              <input className="form-control input-with-icon" placeholder="Your name"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input className="form-control input-with-icon" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <EmailTypoHint email={form.email} onFix={email => setForm(f => ({ ...f, email }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            {/*
              <div className="input-icon-wrap">
              <Phone size={16} className="input-icon" />
              <input className="form-control input-with-icon" type="tel" placeholder="03XX-XXXXXXX"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required />
              </div>
            */}
            <div className="phone-input-group">
              <span className="phone-input-prefix">+92</span>
              <input
                className="form-control"
                type="tel"
                inputMode="numeric"
                placeholder="3XXXXXXXXX"
                maxLength={PH_LOCAL_PHONE_LEN}
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, PH_LOCAL_PHONE_LEN) }))}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-icon-wrap">
              <Lock size={16} className="input-icon" />
              <input className="form-control input-with-icon" type="password" placeholder="Min 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label consent-check" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: '0.2rem' }} required />
              <span>
                I agree to the{' '}
                {/* <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link> */}
                <a href="/terms" onClick={e => { e.preventDefault(); setLegalDoc('terms'); }}>Terms of Service</a>{' '}
                and{' '}
                {/* <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link> */}
                <a href="/privacy" onClick={e => { e.preventDefault(); setLegalDoc('privacy'); }}>Privacy Policy</a>.
              </span>
            </label>
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading || !agreed}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/index/login">Sign In</Link>
        </p>
        <p className="auth-footer">
          <Link to="/index">← Back to Home</Link>
        </p>

        {/* Outside every <form> on purpose — keeps the popup's buttons from ever
            submitting the signup form. */}
        <LegalModal doc={legalDoc} onOpenDoc={setLegalDoc} onClose={() => setLegalDoc(null)} />
      </div>
    </div>
  );
}
