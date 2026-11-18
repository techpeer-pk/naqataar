import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import '../admin/ProfilePage.css';

export default function CsrProfilePage() {
  const { user, isGoogleUser, changePassword } = useAuth();
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success('Password updated!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.code === 'auth/wrong-password' ? 'Current password is incorrect.' : 'Could not update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Profile</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your CSR account.</p>
        </div>
      </div>

      <div className="profile-grid">
        <div className="card">
          <div className="card-header"><h3><ShieldCheck size={16} /> Account</h3></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" value={user?.email || ''} disabled />
              <p className="form-hint">Email cannot be changed here — use the Firebase Console.</p>
            </div>
            <div className="form-group">
              <label className="form-label">UID</label>
              <input className="form-control" value={user?.uid || ''} disabled style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }} />
            </div>
          </div>
        </div>

        {!isGoogleUser() && (
          <div className="card">
            <div className="card-header"><h3><KeyRound size={16} /> Change Password</h3></div>
            <form onSubmit={handleChangePassword} className="card-body">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-control" type="password" value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-control" type="password" minLength={6} value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-control" type="password" minLength={6} value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
