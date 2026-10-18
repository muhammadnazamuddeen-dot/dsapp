import { api } from '../api.js';
import { esc, icon, initials, money, toast } from '../ui.js';

export async function settingsView(root, ctx) {
  const { settings, user } = ctx;
  const isAdmin = user.role === 'admin';

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Configuration</p>
        <h1>Settings</h1>
        <p class="muted">Society branding, membership fees and your account security.</p>
      </div>
    </div>

    <div class="layout-2">
      <div class="stack">
        ${
          isAdmin
            ? `<section class="panel">
                 <div class="panel-head">
                   <div><h2>Society profile</h2><p>Shown across the desk and on printed receipts</p></div>
                 </div>
                 <form id="society-form" novalidate>
                   <p class="form-error" data-form-error role="alert"></p>
                   <div class="field-grid">
                     <div class="field span-2">
                       <label for="society-name">Society name</label>
                       <input id="society-name" name="society_name" type="text" maxlength="80" value="${esc(settings.society_name)}" required />
                     </div>
                     <div class="field span-2">
                       <label for="society-tagline">Tagline</label>
                       <input id="society-tagline" name="tagline" type="text" maxlength="90" value="${esc(settings.tagline)}" />
                     </div>
                     <div class="field">
                       <label for="currency">Currency symbol</label>
                       <input id="currency" name="currency" type="text" maxlength="4" value="${esc(settings.currency)}" required />
                       <span class="hint">For example ৳, ₹, $ or PKR.</span>
                     </div>
                     <div class="field"></div>
                     <div class="field">
                       <label for="general-fee">General membership fee</label>
                       <input id="general-fee" name="general_fee" type="number" min="0" step="1" value="${settings.general_fee}" required />
                       <span class="hint">Current: ${esc(money(settings.general_fee, settings.currency))}</span>
                     </div>
                     <div class="field">
                       <label for="executive-fee">Executive membership fee</label>
                       <input id="executive-fee" name="executive_fee" type="number" min="0" step="1" value="${settings.executive_fee}" required />
                       <span class="hint">Current: ${esc(money(settings.executive_fee, settings.currency))}</span>
                     </div>
                   </div>
                   <div class="form-note">
                     ${icon('info')}
                     <span>Fee changes apply to new registrations only. Existing members keep the amount recorded when they joined.</span>
                   </div>
                   <div class="modal-actions" style="border-top:0;padding-top:12px;margin-top:8px">
                     <button type="submit" class="btn btn-primary">Save settings</button>
                   </div>
                 </form>
               </section>`
            : ''
        }

        <section class="panel">
          <div class="panel-head">
            <div><h2>Change password</h2><p>Use a password only you know</p></div>
          </div>
          <form id="password-form" novalidate>
            <p class="form-error" data-form-error role="alert"></p>
            <div class="field-grid">
              <div class="field span-2">
                <label for="current-password">Current password</label>
                <input id="current-password" name="current_password" type="password" autocomplete="current-password" required />
              </div>
              <div class="field">
                <label for="new-password">New password</label>
                <input id="new-password" name="new_password" type="password" autocomplete="new-password" minlength="8" required />
              </div>
              <div class="field">
                <label for="confirm-password">Confirm new password</label>
                <input id="confirm-password" name="confirm_password" type="password" autocomplete="new-password" minlength="8" required />
              </div>
            </div>
            <div class="modal-actions" style="border-top:0;padding-top:12px;margin-top:8px">
              <button type="submit" class="btn btn-primary">Update password</button>
            </div>
          </form>
        </section>
      </div>

      <div class="stack">
        <section class="panel">
          <div class="panel-head"><div><h2>Your account</h2><p>Signed in to this desk</p></div></div>
          <div class="user-chip" style="padding:0 0 14px">
            <span class="avatar" style="width:44px;height:44px;font-size:14px">${esc(initials(user.full_name))}</span>
            <div>
              <div class="user-chip-name" style="color:var(--ink)">${esc(user.full_name)}</div>
              <div class="member-meta">@${esc(user.username)} · ${esc(user.role === 'admin' ? 'Administrator' : 'Desk member')}</div>
            </div>
          </div>
          ${
            isAdmin
              ? `<a class="btn btn-ghost btn-block" href="#/users">${icon('shield')}Manage desk accounts</a>`
              : '<p class="muted small">Ask an administrator if you need a new account or a password reset.</p>'
          }
        </section>

        <section class="panel help-card">
          <h3>Good to know</h3>
          <ul>
            <li>Membership IDs follow the pattern DS-YEAR-0001 and never repeat.</li>
            <li>Offline payments are cash collected at the desk; online payments require a transaction reference.</li>
            <li>CSV export of the full roster is available to admins from the Members page.</li>
            <li>Change the seeded demo passwords before using this desk for real registrations.</li>
          </ul>
        </section>
      </div>
    </div>`;

  const societyForm = root.querySelector('#society-form');
  if (societyForm) {
    const errorEl = societyForm.querySelector('[data-form-error]');
    const submit = societyForm.querySelector('button[type="submit"]');

    societyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorEl.textContent = '';

      const name = societyForm.elements.society_name.value.trim();
      const currency = societyForm.elements.currency.value.trim();
      const generalFee = societyForm.elements.general_fee.value.trim();
      const executiveFee = societyForm.elements.executive_fee.value.trim();
      const feeValue = (value) => (/^\d+$/.test(value) ? Number(value) : NaN);

      if (name.length < 2) {
        errorEl.textContent = 'Society name must be at least 2 characters.';
        return;
      }
      if (!currency) {
        errorEl.textContent = 'Enter a currency symbol.';
        return;
      }
      if (!Number.isInteger(feeValue(generalFee)) || !Number.isInteger(feeValue(executiveFee))) {
        errorEl.textContent = 'Both fees must be whole numbers, zero or greater.';
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Saving…';

      try {
        await api.updateSettings({
          society_name: name,
          tagline: societyForm.elements.tagline.value.trim(),
          currency,
          general_fee: feeValue(generalFee),
          executive_fee: feeValue(executiveFee),
        });
        await ctx.refreshSettings();
        toast('Society settings saved.');
        submit.disabled = false;
        submit.textContent = 'Save settings';
      } catch (error) {
        errorEl.textContent = error.message;
        submit.disabled = false;
        submit.textContent = 'Save settings';
      }
    });
  }

  const passwordForm = root.querySelector('#password-form');
  const passwordError = passwordForm.querySelector('[data-form-error]');
  const passwordSubmit = passwordForm.querySelector('button[type="submit"]');

  passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    passwordError.textContent = '';

    const current = passwordForm.elements.current_password.value;
    const next = passwordForm.elements.new_password.value;
    const confirm = passwordForm.elements.confirm_password.value;

    if (next.length < 8) {
      passwordError.textContent = 'New password must be at least 8 characters.';
      return;
    }
    if (next !== confirm) {
      passwordError.textContent = 'The new passwords do not match.';
      return;
    }

    passwordSubmit.disabled = true;
    passwordSubmit.textContent = 'Updating…';

    try {
      await api.changePassword(current, next);
      toast('Password updated. Please sign in again.', 'success');
      setTimeout(() => ctx.signOut(), 1100);
    } catch (error) {
      passwordError.textContent = error.message;
      passwordSubmit.disabled = false;
      passwordSubmit.textContent = 'Update password';
    }
  });
}
