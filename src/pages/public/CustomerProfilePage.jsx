import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, User, Camera, Trash2, KeyRound, LogOut, AlertTriangle, CalendarCheck, Clock, Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { isValidLocalPhoneDigits, toFullPhone, stripCountryCode, PH_LOCAL_PHONE_LEN } from '../../utils/validation';
import { useAuth } from '../../context/AuthContext';
import { useAppointments } from '../../hooks/useAppointments';
import { accountRef } from '../../utils/format';
import { enableNotifications, disableNotifications, NOTIF_OPT_OUT_KEY } from '../../hooks/usePwaPushRegistration';
import './CustomerProfilePage.css';
import { t } from '../../i18n';

const notifSupported = typeof Notification !== 'undefined';

export default function CustomerProfilePage() {
  const {
    user, userProfile, loading: authLoading,
    updateUserProfile, uploadAvatar, removeAvatar,
    isGoogleUser, changePassword, deleteAccount, logout,
  } = useAuth();
  const navigate = useNavigate();
  const { appointments, fetchByEmail } = useAppointments();

  const [form, setForm]       = useState({ displayName: '', phone: '' });
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  const [delPassword, setDelPassword] = useState('');
  const [deleting, setDeleting]       = useState(false);

  const [notifOn, setNotifOn] = useState(
    notifSupported && Notification.permission === 'granted' && localStorage.getItem(NOTIF_OPT_OUT_KEY) !== 'true'
  );
  const [notifBusy, setNotifBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/index/login', { replace: true }); return; }
    if (userProfile) {
      // setForm({ displayName: userProfile.displayName || '', phone: userProfile.phone || '' });
      setForm({ displayName: userProfile.displayName || '', phone: stripCountryCode(userProfile.phone) || '' });
    }
    if (user?.email) fetchByEmail(user.email);
  }, [authLoading, user, userProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim()) { toast.error(t('Name cannot be empty.')); return; }
    if (form.phone && !isValidLocalPhoneDigits(form.phone)) {
      toast.error(t('Please enter a valid {n}-digit phone number.', { n: PH_LOCAL_PHONE_LEN }));
      return;
    }
    setSaving(true);
    try {
      // await updateUserProfile({ displayName: form.displayName.trim(), phone: form.phone.trim() });
      // Empty phone box = leave the stored value alone (merge write) — an old
      // number stripCountryCode() can't parse shows blank, and saving just a
      // name change must not wipe it.
      await updateUserProfile({
        displayName: form.displayName.trim(),
        ...(form.phone ? { phone: toFullPhone(form.phone) } : {}),
      });
      toast.success(t('Profile updated!'));
    } catch {
      toast.error(t('Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(t('Please choose an image file.')); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('Image must be under 5MB.')); return; }
    setUploading(true);
    try {
      await uploadAvatar(file);
      toast.success(t('Photo updated!'));
    } catch {
      toast.error(t('Upload failed.'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      await removeAvatar();
      toast.success(t('Photo removed.'));
    } catch {
      toast.error(t('Could not remove photo.'));
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next.length < 6) { toast.error(t('New password must be at least 6 characters.')); return; }
    if (pwForm.next !== pwForm.confirm) { toast.error(t('Passwords do not match.')); return; }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success(t('Password updated!'));
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.code === 'auth/wrong-password' ? t('Current password is incorrect.') : t('Could not update password.'));
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('This will permanently delete your account and profile data. This cannot be undone. Continue?'))) return;
    setDeleting(true);
    try {
      await deleteAccount(delPassword);
      toast.success(t('Account deleted.'));
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.code === 'auth/wrong-password' ? t('Password is incorrect.') : t('Could not delete account. Try signing in again first.'));
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleNotifications = async () => {
    setNotifBusy(true);
    try {
      if (notifOn) {
        await disableNotifications();
        setNotifOn(false);
        toast.success(t('Notifications turned off.'));
      } else {
        const token = await enableNotifications(user?.uid);
        if (token) {
          setNotifOn(true);
          toast.success(t('Notifications enabled!'));
        } else if (Notification.permission === 'denied') {
          toast.error(t('Blocked in your browser. Allow notifications from site settings to enable.'));
        } else {
          toast.error(t('Could not enable notifications.'));
        }
      }
    } finally {
      setNotifBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/index', { replace: true });
  };

  if (authLoading || !user) return <div className="loading-screen"><div className="spinner" /></div>;

  const upcomingCount = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed').length;
  const initials = (userProfile?.displayName || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="page">
      <div className="container customer-profile-container">
        <div className="customer-profile-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User size={24} color="var(--primary)" />
            <h1>{t('My Profile')}</h1>
          </div>
          <button type="submit" form="customer-profile-form" className="btn btn-primary" disabled={saving}>
            <Save size={16} /> {saving ? t('Saving…') : t('Save Profile')}
          </button>
        </div>

        {/* Avatar */}
        <div className="card profile-avatar-card">
          <div className="card-body profile-avatar-row">
            <div className="profile-avatar">
              {userProfile?.photoURL
                ? <img src={userProfile.photoURL} alt={t('Profile')} />
                : <span>{initials}</span>}
            </div>
            <div className="profile-avatar-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarPick}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={16} /> {uploading ? 'Uploading…' : 'Change Photo'}
              </button>
              {userProfile?.photoURL && (
                <button type="button" className="btn btn-ghost" disabled={uploading} onClick={handleRemoveAvatar}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Activity summary */}
        <div className="profile-stats-row">
          <div className="card profile-stat-card">
            <CalendarCheck size={20} color="var(--primary)" />
            <div>
              <p className="profile-stat-value">{appointments.length}</p>
              <p className="profile-stat-label">{t('Total Bookings')}</p>
            </div>
          </div>
          <div className="card profile-stat-card">
            <Clock size={20} color="var(--primary)" />
            <div>
              <p className="profile-stat-value">{upcomingCount}</p>
              <p className="profile-stat-label">{t('Upcoming')}</p>
            </div>
          </div>
        </div>

        <form id="customer-profile-form" onSubmit={handleSave}>
          <div className="customer-profile-grid">

            {/* Personal Info */}
            <div className="card">
              <div className="card-header"><h3>{t('Personal Information')}</h3></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">{t('Full Name *')}</label>
                  <input
                    className="form-control"
                    placeholder={t('Your name')}
                    value={form.displayName}
                    onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Phone')}</label>
                  {/*
                    <input
                    className="form-control"
                    type="tel"
                    placeholder="03XX-XXXXXXX"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
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
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            {notifSupported && (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3><Bell size={16} /> {t('Push Notifications')}</h3>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifOn}
                    disabled={notifBusy || Notification.permission === 'denied'}
                    className={`toggle-switch ${notifOn ? 'on' : ''}`}
                    onClick={handleToggleNotifications}
                    title={notifOn ? t('Turn off') : t('Turn on')}
                  >
                    <span className="toggle-switch-knob" />
                  </button>
                </div>
                <div className="card-body">
                  <p className="form-hint">
                    {Notification.permission === 'denied'
                      ? t('Blocked in your browser. Allow notifications for this site from your browser settings to enable.')
                      : t('Get notified about your bookings on this device.')}
                  </p>
                </div>
              </div>
            )}

            {/* Account Info (read-only) */}
            <div className="card">
              <div className="card-header"><h3>{t('Account')}</h3></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">{t('Email Address')}</label>
                  <input className="form-control" value={user.email || ''} disabled />
                  <p className="form-hint">{t('Email cannot be changed.')}</p>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Account Type')}</label>
                  <input className="form-control" value={t('Customer')} disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Support ID')}</label>
                  <input className="form-control" value={accountRef(user.uid)} disabled style={{ fontFamily: 'ui-monospace, monospace' }} />
                  <p className="form-hint">{t("Quote this when you call Support — it helps us confirm it's really you.")}</p>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Member Since')}</label>
                  <input
                    className="form-control"
                    value={user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Security */}
        {!isGoogleUser() && (
          <form onSubmit={handleChangePassword} className="card profile-section-card">
            <div className="card-header"><h3><KeyRound size={16} /> {t('Change Password')}</h3></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">{t('Current Password')}</label>
                <input
                  className="form-control"
                  type="password"
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('New Password')}</label>
                <input
                  className="form-control"
                  type="password"
                  minLength={6}
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Confirm New Password')}</label>
                <input
                  className="form-control"
                  type="password"
                  minLength={6}
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={pwSaving}>
                {pwSaving ? t('Updating…') : t('Update Password')}
              </button>
            </div>
          </form>
        )}

        {/* Logout */}
        <div className="card profile-section-card">
          <div className="card-body profile-logout-row">
            <div>
              <h3>{t('Sign Out')}</h3>
              <p className="form-hint">{t("You'll need to sign in again to book or view appointments.")}</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              <LogOut size={16} /> {t('Sign Out')}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card profile-section-card profile-danger-card">
          <div className="card-header"><h3><AlertTriangle size={16} /> {t('Danger Zone')}</h3></div>
          <div className="card-body">
            <p className="form-hint">{t('Deleting your account permanently removes your profile. Your appointment history stays with the clinics you booked with.')}</p>
            {!isGoogleUser() && (
              <div className="form-group">
                <label className="form-label">{t('Confirm Password')}</label>
                <input
                  className="form-control"
                  type="password"
                  placeholder={t('Enter password to confirm')}
                  value={delPassword}
                  onChange={e => setDelPassword(e.target.value)}
                />
              </div>
            )}
            <button type="button" className="btn btn-danger" disabled={deleting} onClick={handleDeleteAccount}>
              <Trash2 size={16} /> {deleting ? t('Deleting…') : t('Delete My Account')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
