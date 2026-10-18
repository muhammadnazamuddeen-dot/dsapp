import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useConfirm, useToast } from '../context/UIContext';
import { ActiveBadge, RoleBadge } from '../components/Badges';
import { Icon } from '../components/Icon';
import { ErrorPanel, PageLoading } from '../components/States';
import { Modal } from '../components/Modal';
import { fmtDate, initials } from '../lib/format';

export function UsersPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.listUsers();
      setUsers(response.users);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (loading) return <PageLoading label="Loading accounts…" />;
  if (error) return <ErrorPanel message={error} onRetry={load} />;

  async function toggleUser(target) {
    const enabling = !target.active;
    if (!enabling) {
      const confirmed = await confirm({
        title: 'Disable this account?',
        message: `${target.full_name} (@${target.username}) will be signed out and unable to sign in until re-enabled.`,
        confirmLabel: 'Disable account',
        danger: true,
      });
      if (!confirmed) return;
    }

    try {
      await api.updateUser(target.id, { active: enabling });
      toast(enabling ? 'Account enabled.' : 'Account disabled.');
      load();
    } catch (requestError) {
      toast(requestError.message, 'error');
    }
  }

  function requestReset(target) {
    if (target.id === user.id) {
      toast('Use Settings → Change password to update your own password.', 'info');
      return;
    }
    setResetTarget(target);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Desk accounts</h1>
          <p className="muted">
            Admins manage members, accounts and settings. Desk members register members and collect
            payments.
          </p>
        </div>
        <div className="page-head-actions">
          <button className="btn btn-primary" type="button" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" />
            Add account
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Access</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((account) => {
                const isSelf = account.id === user.id;
                return (
                  <tr key={account.id}>
                    <td>
                      <div className="member-cell">
                        <span className={`avatar ${account.role === 'admin' ? '' : 'ink'}`.trim()}>
                          {initials(account.full_name)}
                        </span>
                        <div>
                          <div className="member-name">
                            {account.full_name}
                            {isSelf && (
                              <>
                                {' '}
                                <span className="muted small">(you)</span>
                              </>
                            )}
                          </div>
                          <div className="member-meta">@{account.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={account.role} />
                    </td>
                    <td>
                      <ActiveBadge active={account.active} />
                    </td>
                    <td className="nowrap" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      {fmtDate(account.created_at)}
                    </td>
                    <td className="td-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => requestReset(account)}
                      >
                        Reset password
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          className={`btn ${account.active ? 'btn-ghost' : 'btn-primary'} btn-sm`}
                          onClick={() => toggleUser(account)}
                        >
                          {account.active ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel help-card" style={{ marginTop: 18 }}>
        <h3>Access rules</h3>
        <ul>
          <li>
            <strong>Admin:</strong> full access to members, payments, accounts, settings and CSV
            export.
          </li>
          <li>
            <strong>Desk member:</strong> can register new members, view the roster and record
            payments. Cannot delete members or manage accounts.
          </li>
          <li>Disabling an account signs that person out immediately.</li>
        </ul>
      </section>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          target={resetTarget}
          onClose={() => setResetTarget(null)}
          onSaved={() => setResetTarget(null)}
        />
      )}
    </>
  );
}

function CreateUserModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    role: 'desk',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const payload = {
      full_name: form.full_name.trim(),
      username: form.username.trim(),
      role: form.role,
      password: form.password,
    };
    if (!payload.full_name) return setError('Enter the person’s full name.');
    if (!payload.username) return setError('Enter a username.');
    if (payload.password.length < 8) return setError('Password must be at least 8 characters.');

    setSubmitting(true);
    try {
      await api.createUser(payload);
      toast(`Account @${payload.username} created.`);
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <div>
          <p className="eyebrow">New account</p>
          <h3>Add a desk account</h3>
          <p className="muted">Give a desk member or administrator access.</p>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <p className="form-error" role="alert">
          {error}
        </p>
        <div className="field-grid">
          <div className="field span-2">
            <label htmlFor="new-name">Full name</label>
            <input
              id="new-name"
              name="full_name"
              type="text"
              maxLength={80}
              autoComplete="name"
              value={form.full_name}
              onChange={(event) => update('full_name', event.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-username">Username</label>
            <input
              id="new-username"
              name="username"
              type="text"
              maxLength={30}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. desk.rafi"
              value={form.username}
              onChange={(event) => update('username', event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-role">Role</label>
            <select
              id="new-role"
              name="role"
              value={form.role}
              onChange={(event) => update('role', event.target.value)}
            >
              <option value="desk">Desk member</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="field span-2">
            <label htmlFor="new-password">Temporary password</label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              required
            />
            <span className="hint">
              At least 8 characters. Share it with them and ask them to change it.
            </span>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ target, onClose, onSaved }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateUser(target.id, { password });
      toast(`Password reset for @${target.username}.`);
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="modal-head">
        <div>
          <p className="eyebrow">Reset password</p>
          <h3>{target.full_name}</h3>
          <p className="muted">@{target.username}</p>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <p className="form-error" role="alert">
          {error}
        </p>
        <div className="field">
          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError('');
            }}
            autoFocus
            required
          />
          <span className="hint">At least 8 characters. This signs the account out everywhere.</span>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
