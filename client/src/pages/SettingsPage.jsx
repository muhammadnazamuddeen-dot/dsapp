import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/UIContext';
import { Icon } from '../components/Icon';
import { initials, money } from '../lib/format';

export function SettingsPage() {
  const { settings, user, refreshSettings, logout } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === 'admin';
  const logoutTimer = useRef(null);

  const [society, setSociety] = useState({
    society_name: settings.society_name,
    tagline: settings.tagline,
    currency: settings.currency,
    general_fee: String(settings.general_fee),
    executive_fee: String(settings.executive_fee),
  });
  const [societyError, setSocietyError] = useState('');
  const [savingSociety, setSavingSociety] = useState(false);

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setSociety({
      society_name: settings.society_name,
      tagline: settings.tagline,
      currency: settings.currency,
      general_fee: String(settings.general_fee),
      executive_fee: String(settings.executive_fee),
    });
  }, [settings]);

  useEffect(() => () => clearTimeout(logoutTimer.current), []);

  function updateSociety(field, value) {
    setSociety((current) => ({ ...current, [field]: value }));
    setSocietyError('');
  }

  function updatePassword(field, value) {
    setPasswords((current) => ({ ...current, [field]: value }));
    setPasswordError('');
  }

  async function handleSocietySubmit(event) {
    event.preventDefault();
    setSocietyError('');

    const name = society.society_name.trim();
    const currency = society.currency.trim();
    const feeValue = (value) => (/^\d+$/.test(value) ? Number(value) : NaN);
    const generalFee = feeValue(society.general_fee.trim());
    const executiveFee = feeValue(society.executive_fee.trim());

    if (name.length < 2) return setSocietyError('Society name must be at least 2 characters.');
    if (!currency) return setSocietyError('Enter a currency symbol.');
    if (!Number.isInteger(generalFee) || !Number.isInteger(executiveFee)) {
      return setSocietyError('Both fees must be whole numbers, zero or greater.');
    }

    setSavingSociety(true);
    try {
      await api.updateSettings({
        society_name: name,
        tagline: society.tagline.trim(),
        currency,
        general_fee: generalFee,
        executive_fee: executiveFee,
      });
      await refreshSettings();
      toast('Society settings saved.');
    } catch (error) {
      setSocietyError(error.message);
    } finally {
      setSavingSociety(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError('');

    const current = passwords.current_password;
    const next = passwords.new_password;
    const confirm = passwords.confirm_password;

    if (next.length < 8) return setPasswordError('New password must be at least 8 characters.');
    if (next !== confirm) return setPasswordError('The new passwords do not match.');

    setSavingPassword(true);
    try {
      await api.changePassword(current, next);
      toast('Password updated. Please sign in again.');
      logoutTimer.current = setTimeout(() => logout(), 1100);
    } catch (error) {
      setPasswordError(error.message);
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
          <p className="muted">Society branding, membership fees and your account security.</p>
        </div>
      </div>

      <div className="layout-2">
        <div className="stack">
          {isAdmin && (
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Society profile</h2>
                  <p>Shown across the desk and on printed receipts</p>
                </div>
              </div>
              <form onSubmit={handleSocietySubmit} noValidate>
                <p className="form-error" role="alert">
                  {societyError}
                </p>
                <div className="field-grid">
                  <div className="field span-2">
                    <label htmlFor="society-name">Society name</label>
                    <input
                      id="society-name"
                      name="society_name"
                      type="text"
                      maxLength={80}
                      value={society.society_name}
                      onChange={(event) => updateSociety('society_name', event.target.value)}
                      required
                    />
                  </div>
                  <div className="field span-2">
                    <label htmlFor="society-tagline">Tagline</label>
                    <input
                      id="society-tagline"
                      name="tagline"
                      type="text"
                      maxLength={90}
                      value={society.tagline}
                      onChange={(event) => updateSociety('tagline', event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="currency">Currency symbol</label>
                    <input
                      id="currency"
                      name="currency"
                      type="text"
                      maxLength={4}
                      value={society.currency}
                      onChange={(event) => updateSociety('currency', event.target.value)}
                      required
                    />
                    <span className="hint">For example ৳, ₹, $ or PKR.</span>
                  </div>
                  <div className="field" />
                  <div className="field">
                    <label htmlFor="general-fee">General membership fee</label>
                    <input
                      id="general-fee"
                      name="general_fee"
                      type="number"
                      min="0"
                      step="1"
                      value={society.general_fee}
                      onChange={(event) => updateSociety('general_fee', event.target.value)}
                      required
                    />
                    <span className="hint">
                      Current: {money(settings.general_fee, settings.currency)}
                    </span>
                  </div>
                  <div className="field">
                    <label htmlFor="executive-fee">Executive membership fee</label>
                    <input
                      id="executive-fee"
                      name="executive_fee"
                      type="number"
                      min="0"
                      step="1"
                      value={society.executive_fee}
                      onChange={(event) => updateSociety('executive_fee', event.target.value)}
                      required
                    />
                    <span className="hint">
                      Current: {money(settings.executive_fee, settings.currency)}
                    </span>
                  </div>
                </div>
                <div className="form-note">
                  <Icon name="info" />
                  <span>
                    Fee changes apply to new registrations only. Existing members keep the amount
                    recorded when they joined.
                  </span>
                </div>
                <div className="modal-actions" style={{ borderTop: 0, paddingTop: 12, marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={savingSociety}>
                    {savingSociety ? 'Saving…' : 'Save settings'}
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Change password</h2>
                <p>Use a password only you know</p>
              </div>
            </div>
            <form onSubmit={handlePasswordSubmit} noValidate>
              <p className="form-error" role="alert">
                {passwordError}
              </p>
              <div className="field-grid">
                <div className="field span-2">
                  <label htmlFor="current-password">Current password</label>
                  <input
                    id="current-password"
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    value={passwords.current_password}
                    onChange={(event) => updatePassword('current_password', event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    name="new_password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={passwords.new_password}
                    onChange={(event) => updatePassword('new_password', event.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <input
                    id="confirm-password"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={passwords.confirm_password}
                    onChange={(event) => updatePassword('confirm_password', event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions" style={{ borderTop: 0, paddingTop: 12, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Your account</h2>
                <p>Signed in to this desk</p>
              </div>
            </div>
            <div className="user-chip" style={{ padding: '0 0 14px' }}>
              <span className="avatar" style={{ width: 44, height: 44, fontSize: 14 }}>
                {initials(user.full_name)}
              </span>
              <div>
                <div className="user-chip-name" style={{ color: 'var(--ink)' }}>
                  {user.full_name}
                </div>
                <div className="member-meta">
                  @{user.username} · {isAdmin ? 'Administrator' : 'Desk member'}
                </div>
              </div>
            </div>
            {isAdmin ? (
              <Link className="btn btn-ghost btn-block" to="/users">
                <Icon name="shield" />
                Manage desk accounts
              </Link>
            ) : (
              <p className="muted small">
                Ask an administrator if you need a new account or a password reset.
              </p>
            )}
          </section>

          <section className="panel help-card">
            <h3>Good to know</h3>
            <ul>
              <li>Membership IDs follow the pattern DS-YEAR-0001 and never repeat.</li>
              <li>
                Offline payments are cash collected at the desk; online payments require a
                transaction reference.
              </li>
              <li>CSV export of the full roster is available to admins from the Members page.</li>
              <li>Change the initial admin and desk passwords before real registrations begin.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
