import { api } from '../api.js';
import { confirmDialog, esc, fmtDate, icon, initials, openModal, toast } from '../ui.js';

export async function usersView(root, ctx) {
  if (ctx.user.role !== 'admin') {
    root.innerHTML = `<div class="panel error-panel">
      <div class="empty-icon">${icon('shield')}</div>
      <h3 style="font-family:var(--font-display);font-weight:400;font-size:22px">Admins only</h3>
      <p>You need an administrator account to manage desk access.</p>
      <a class="btn btn-primary" href="#/dashboard">Back to dashboard</a>
    </div>`;
    return;
  }

  const { users } = await api.listUsers();
  const byId = new Map(users.map((user) => [String(user.id), user]));

  const rows = users
    .map((user) => {
      const isSelf = user.id === ctx.user.id;
      const active = user.active;
      return `
      <tr>
        <td>
          <div class="member-cell">
            <span class="avatar ${user.role === 'admin' ? '' : 'ink'}">${esc(initials(user.full_name))}</span>
            <div>
              <div class="member-name">${esc(user.full_name)}${isSelf ? ' <span class="muted small">(you)</span>' : ''}</div>
              <div class="member-meta">@${esc(user.username)}</div>
            </div>
          </div>
        </td>
        <td>${user.role === 'admin' ? '<span class="badge badge-executive">Administrator</span>' : '<span class="badge badge-general">Desk member</span>'}</td>
        <td>${active ? '<span class="badge badge-paid"><span class="dot"></span>Active</span>' : '<span class="badge badge-pending"><span class="dot"></span>Disabled</span>'}</td>
        <td style="font-size:12.5px;color:var(--muted)" class="nowrap">${esc(fmtDate(user.created_at))}</td>
        <td class="td-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-reset="${user.id}">Reset password</button>
          ${
            isSelf
              ? ''
              : `<button type="button" class="btn ${active ? 'btn-ghost' : 'btn-primary'} btn-sm" data-toggle="${user.id}">
                   ${active ? 'Disable' : 'Enable'}
                 </button>`
          }
        </td>
      </tr>`;
    })
    .join('');

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Administration</p>
        <h1>Desk accounts</h1>
        <p class="muted">Admins manage members, accounts and settings. Desk members register members and collect payments.</p>
      </div>
      <div class="page-head-actions">
        <button class="btn btn-primary" type="button" id="add-user">${icon('plus')}Add account</button>
      </div>
    </div>

    <section class="panel">
      <div class="table-wrap">
        <table class="data" id="users-table">
          <thead>
            <tr><th>Account</th><th>Role</th><th>Access</th><th>Added</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>

    <section class="panel help-card" style="margin-top:18px">
      <h3>Access rules</h3>
      <ul>
        <li><strong>Admin:</strong> full access to members, payments, accounts, settings and CSV export.</li>
        <li><strong>Desk member:</strong> can register new members, view the roster and record payments. Cannot delete members or manage accounts.</li>
        <li>Disabling an account signs that person out immediately.</li>
      </ul>
    </section>`;

  root.querySelector('#add-user').addEventListener('click', () => openCreateUser(ctx));

  root.querySelector('#users-table').addEventListener('click', async (event) => {
    const resetButton = event.target.closest('[data-reset]');
    if (resetButton) {
      const target = byId.get(resetButton.dataset.reset);
      if (!target) return;
      if (target.id === ctx.user.id) {
        toast('Use Settings → Change password to update your own password.', 'info');
        return;
      }
      openResetPassword(target, ctx);
      return;
    }

    const toggleButton = event.target.closest('[data-toggle]');
    if (toggleButton) {
      const target = byId.get(toggleButton.dataset.toggle);
      if (!target) return;
      const enabling = !target.active;
      if (!enabling) {
        const confirmed = await confirmDialog({
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
        ctx.reload();
      } catch (error) {
        toast(error.message, 'error');
      }
    }
  });
}

function openCreateUser(ctx) {
  const { root, close } = openModal(
    `<div class="modal-head">
       <div><p class="eyebrow">New account</p><h3>Add a desk account</h3><p class="muted">Give a desk member or administrator access.</p></div>
       <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
     </div>
     <form id="new-user-form" novalidate>
       <p class="form-error" data-form-error role="alert"></p>
       <div class="field-grid">
         <div class="field span-2">
           <label for="new-name">Full name</label>
           <input id="new-name" name="full_name" type="text" maxlength="80" autocomplete="name" required autofocus />
         </div>
         <div class="field">
           <label for="new-username">Username</label>
           <input id="new-username" name="username" type="text" maxlength="30" autocomplete="off" spellcheck="false" placeholder="e.g. desk.rafi" required />
         </div>
         <div class="field">
           <label for="new-role">Role</label>
           <select id="new-role" name="role">
             <option value="desk">Desk member</option>
             <option value="admin">Administrator</option>
           </select>
         </div>
         <div class="field span-2">
           <label for="new-password">Temporary password</label>
           <input id="new-password" name="password" type="password" autocomplete="new-password" minlength="8" required />
           <span class="hint">At least 8 characters. Share it with them and ask them to change it.</span>
         </div>
       </div>
       <div class="modal-actions">
         <button type="button" class="btn btn-ghost" data-close>Cancel</button>
         <button type="submit" class="btn btn-primary">Create account</button>
       </div>
     </form>`
  );

  const form = root.querySelector('#new-user-form');
  const errorEl = root.querySelector('[data-form-error]');
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Creating…';

    try {
      const payload = {
        full_name: form.elements.full_name.value.trim(),
        username: form.elements.username.value.trim(),
        role: form.elements.role.value,
        password: form.elements.password.value,
      };
      if (!payload.full_name) throw new Error('Enter the person’s full name.');
      if (!payload.username) throw new Error('Enter a username.');
      if (payload.password.length < 8) throw new Error('Password must be at least 8 characters.');

      await api.createUser(payload);
      toast(`Account @${payload.username} created.`);
      close();
      ctx.reload();
    } catch (error) {
      errorEl.textContent = error.message;
      submit.disabled = false;
      submit.textContent = 'Create account';
    }
  });
}

function openResetPassword(target, ctx) {
  const { root, close } = openModal(
    `<div class="modal-head">
       <div><p class="eyebrow">Reset password</p><h3>${esc(target.full_name)}</h3><p class="muted">@${esc(target.username)}</p></div>
       <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
     </div>
     <form id="reset-form" novalidate>
       <p class="form-error" data-form-error role="alert"></p>
       <div class="field">
         <label for="reset-password">New password</label>
         <input id="reset-password" name="password" type="password" autocomplete="new-password" minlength="8" required autofocus />
         <span class="hint">At least 8 characters. This signs the account out everywhere.</span>
       </div>
       <div class="modal-actions">
         <button type="button" class="btn btn-ghost" data-close>Cancel</button>
         <button type="submit" class="btn btn-primary">Reset password</button>
       </div>
     </form>`
  );

  const form = root.querySelector('#reset-form');
  const errorEl = root.querySelector('[data-form-error]');
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    if (form.elements.password.value.length < 8) {
      errorEl.textContent = 'Password must be at least 8 characters.';
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Resetting…';
    try {
      await api.updateUser(target.id, { password: form.elements.password.value });
      toast(`Password reset for @${target.username}.`);
      close();
    } catch (error) {
      errorEl.textContent = error.message;
      submit.disabled = false;
      submit.textContent = 'Reset password';
    }
  });
}
