import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import PasswordField from '../../components/shared/PasswordField';
import InstallAppButton from '../../components/shared/InstallAppButton';
import '../admin/AdminAuth.css';

const MODES = {
  customer: {
    path: '/index/login',
    tabLabel: 'Customer',
    brandTag: 'Customer',
    title: 'Sign In',
    subtitle: 'View and manage your appointments.',
    emailPlaceholder: 'you@example.com',
    googleRole: 'customer',
    homeRedirect: '/index/my-appointments',
  },
  business: {
    path: '/admin/login',
    tabLabel: 'Business',
    brandTag: 'Business',
    title: 'Business Login',
    subtitle: 'Sign in to manage your appointments.',
    emailPlaceholder: 'business@example.com',
    googleRole: 'businessAdmin',
    homeRedirect: '/admin/dashboard',
  },
};

export default function LoginPage() {
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const modeKey = pathname.startsWith('/admin') ? 'business' : 'customer';
  const mode = MODES[modeKey];
  const [form, setForm]     = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!form.email.trim()) { toast.error('Enter your email above first.'); return; }
    try {
      await resetPassword(form.email.trim());
      toast.success('Password reset email sent.');
    } catch {
      toast.error('Could not send reset email. Check the address and try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { isSuperAdmin } = await login(form.email, form.password, mode.googleRole);
      toast.success('Welcome back!');
      navigate(mode.homeRedirect); // Naqatar: no /superadmin (stays on QuFree)
    } catch (err) {
      if (err.code === 'auth/invalid-credential') toast.error('Invalid email or password.');
      else if (err.code === 'auth/role-mismatch') toast.error(err.message);
      else toast.error('Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const { isSuperAdmin } = await loginWithGoogle(mode.googleRole);
      toast.success('Welcome!');
      navigate(mode.homeRedirect); // Naqatar: no /superadmin (stays on QuFree)
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card fade-up">
        {/* 2026-11-17: Customer/Business tab removed (user request). The mode
            still comes from the URL — /index/login = customer, /admin/login =
            business (footer "Business Login" link). */}
        {/* <div className="auth-tabs">
          {Object.entries(MODES).map(([key, m]) => (
            <button
              key={key}
              type="button"
              className={`auth-tab${key === modeKey ? ' active' : ''}`}
              onClick={() => key !== modeKey && navigate(m.path)}
            >
              {m.tabLabel}
            </button>
          ))}
        </div> */}

        <div className="auth-brand">
          {/* <img src="/qunjee-logo.png" alt="Qunjee" className="auth-logo-img" /> */}
          {/* <img src="/qufree-logo.png" alt="Qufree" className="auth-logo-img" /> */}
          <img src="/qufree-wordmark.png" alt="Qufree" className="auth-logo-img" />
          <span className="auth-brand-tag">{mode.brandTag}</span>
        </div>

        <h1 className="auth-title">{mode.title}</h1>
        <p className="auth-sub">{mode.subtitle}</p>

        {/* Business Login has no Google button — new business accounts can
            only be created via Register Business (email/password), and an
            existing admin's account lives under their email/password uid,
            not a Google-provider one. The Google button on this page only
            ever led to a rejected/signed-out attempt for anyone without a
            pre-existing matching account (see AuthContext.loginWithGoogle),
            which was confusing real testers into thinking sign-in failed —
            removed rather than left as a dead end. */}
        {modeKey === 'customer' && (
          <>
            <button className="btn btn-ghost btn-full google-btn" onClick={handleGoogle} disabled={loading}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} />
              Continue with Google
            </button>

            <div className="auth-divider"><span>or</span></div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input className="form-control input-with-icon" type="email" placeholder={mode.emailPlaceholder}
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="form-label">Password</label>
              <button type="button" className="link-btn" onClick={handleForgotPassword} disabled={loading}>Forgot password?</button>
            </div>
            <PasswordField value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            <LogIn size={16} /> {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {modeKey === 'customer' ? (
          <p className="auth-footer">
            New here? <Link to="/index/register">Create an account</Link>
          </p>
        ) : (
          <p className="auth-footer">
            New business? <Link to="/admin/register">Register here</Link>
          </p>
        )}

        <p className="auth-footer">
          <InstallAppButton />
        </p>

        {/* 2026-11-17: replaces the removed Customer/Business tab — a plain
            text link to the other login, right under Install App. */}
        <p className="auth-footer auth-switch-link">
          {modeKey === 'customer'
            ? <Link to="/admin/login">Business login</Link>
            : <Link to="/index/login">Customer login</Link>}
        </p>
      </div>
    </div>
  );
}
