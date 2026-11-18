import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, LogIn, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import PasswordField from '../../components/shared/PasswordField';
import '../admin/AdminAuth.css';

export default function OpsLogin() {
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: '', password: '' });
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
      await login(form.email, form.password);
      navigate('/oprations');
    } catch (err) {
      toast.error(err.code === 'auth/invalid-credential' ? 'Invalid email or password.' : 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card fade-up">
        <div className="auth-brand">
          <Briefcase size={22} color="var(--primary)" />
          <span className="auth-brand-tag">Qunjee Operations</span>
        </div>

        <h1 className="auth-title">Operations Console</h1>
        <p className="auth-sub">Sign in with your Operations team credentials.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-icon-wrap">
              <Mail size={16} className="input-icon" />
              <input className="form-control input-with-icon" type="email" placeholder="you@example.com"
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
      </div>
    </div>
  );
}
