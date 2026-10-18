import { api } from '../api.js';
import {
  confirmDialog,
  esc,
  fmtDate,
  fmtDateTime,
  icon,
  initials,
  money,
  openModal,
  paymentBadge,
  titleCase,
  toast,
  typeBadge,
} from '../ui.js';

/* ------------------------------- directory ---------------------------- */

export async function membersView(root, ctx) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const state = {
    page: 1,
    limit: 10,
    q: params.get('q') || '',
    type: params.get('type') || '',
    payment: params.get('payment') || '',
  };
  const initialMember = params.get('member');
  const isAdmin = ctx.user.role === 'admin';
  const currency = ctx.settings.currency;

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Roster</p>
        <h1>Members</h1>
        <p class="muted">Every general and executive member, with payment status and desk records.</p>
      </div>
      <div class="page-head-actions">
        <a class="btn btn-primary" href="#/register">${icon('plus')}Register member</a>
      </div>
    </div>

    <section class="panel">
      <div class="table-toolbar">
        <div class="search">
          ${icon('search')}
          <input id="member-search" type="search" placeholder="Search name, roll, phone or member ID" value="${esc(state.q)}" aria-label="Search members" />
        </div>
        <select id="filter-type" aria-label="Filter by membership plan">
          <option value="">All plans</option>
          <option value="general">General</option>
          <option value="executive">Executive</option>
        </select>
        <select id="filter-payment" aria-label="Filter by payment status">
          <option value="">All payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
        <span class="spacer"></span>
        ${isAdmin ? `<button class="btn btn-ghost btn-sm" type="button" id="export-btn" title="Admin only — downloads the filtered roster as a spreadsheet">${icon('download')}Export CSV</button>` : ''}
      </div>
      <div id="member-results"></div>
    </section>`;

  const results = root.querySelector('#member-results');
  const searchInput = root.querySelector('#member-search');
  const typeFilter = root.querySelector('#filter-type');
  const paymentFilter = root.querySelector('#filter-payment');
  typeFilter.value = state.type;
  paymentFilter.value = state.payment;

  let requestId = 0;

  function resetFilters() {
    state.q = '';
    state.type = '';
    state.payment = '';
    state.page = 1;
    searchInput.value = '';
    typeFilter.value = '';
    paymentFilter.value = '';
    load();
  }

  function errorPanel(message) {
    return `<div class="panel error-panel" style="margin:16px auto">
      <div class="empty-icon">${icon('alert')}</div>
      <h3 style="font-family:var(--font-display);font-weight:400;font-size:20px">Could not load members</h3>
      <p>${esc(message)}</p>
      <button class="btn btn-primary" type="button" data-retry>Try again</button>
    </div>`;
  }

  function renderTable(data) {
    if (data.total === 0) {
      const filtered = Boolean(state.q || state.type || state.payment);
      results.innerHTML = `<div class="empty-state">
        <div class="empty-icon">${icon(filtered ? 'search' : 'users')}</div>
        <h3>${filtered ? 'No matching members' : 'No members yet'}</h3>
        <p>${filtered ? 'Try a different search or clear the filters to see the full roster.' : 'Register the first member to start building the society roster.'}</p>
        ${
          filtered
            ? '<button class="btn btn-ghost" type="button" data-reset>Clear filters</button>'
            : '<a class="btn btn-primary" href="#/register">Register a member</a>'
        }
      </div>`;
      return;
    }

    const start = (data.page - 1) * data.limit + 1;
    const end = Math.min(data.total, data.page * data.limit);

    const rows = data.members
      .map(
        (member) => `
        <tr class="clickable" data-id="${member.id}">
          <td>
            <div class="member-cell">
              <span class="avatar">${esc(initials(member.full_name))}</span>
              <div>
                <div class="member-name">${esc(member.full_name)}</div>
                <div class="member-meta">${esc(member.member_code)} · ${esc(member.department)}</div>
              </div>
            </div>
          </td>
          <td class="mono" style="font-size:12.5px">${esc(member.roll_number)}</td>
          <td class="nowrap" style="font-size:12.5px">${esc(member.contact_number)}</td>
          <td>${typeBadge(member.membership_type)}</td>
          <td>
            ${paymentBadge(member.payment_status)}
            <div class="member-meta">${esc(money(member.amount, currency))} · ${esc(titleCase(member.payment_mode))}</div>
          </td>
          <td class="nowrap" style="font-size:12.5px;color:var(--muted)">${esc(fmtDate(member.created_at))}</td>
          <td class="td-actions"><button class="btn btn-ghost btn-sm" type="button" data-view="${member.id}">View</button></td>
        </tr>`
      )
      .join('');

    results.innerHTML = `
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Member</th>
              <th>Roll no.</th>
              <th>Contact</th>
              <th>Plan</th>
              <th>Payment</th>
              <th>Registered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="pagination">
        <span>Showing ${start}–${end} of ${data.total} member${data.total === 1 ? '' : 's'}</span>
        <div class="page-btns">
          <button class="btn btn-ghost btn-sm" type="button" data-page="${data.page - 1}" ${data.page <= 1 ? 'disabled' : ''}>
            ${icon('chevronLeft')}Prev
          </button>
          <span class="pill-note">Page ${data.page} of ${data.pages}</span>
          <button class="btn btn-ghost btn-sm" type="button" data-page="${data.page + 1}" ${data.page >= data.pages ? 'disabled' : ''}>
            Next${icon('chevronRight')}
          </button>
        </div>
      </div>`;
  }

  async function load() {
    const id = ++requestId;
    if (!results.querySelector('table')) {
      results.innerHTML = `<div class="page-loading" style="min-height:200px"><span class="spinner"></span>Loading members…</div>`;
    }
    try {
      const data = await api.listMembers({
        q: state.q,
        type: state.type,
        payment: state.payment,
        page: state.page,
        limit: state.limit,
      });
      if (id !== requestId) return;
      state.page = data.page;
      renderTable(data);
    } catch (error) {
      if (id !== requestId) return;
      results.innerHTML = errorPanel(error.message);
      results.querySelector('[data-retry]')?.addEventListener('click', load);
    }
  }

  results.addEventListener('click', (event) => {
    const reset = event.target.closest('[data-reset]');
    if (reset) {
      resetFilters();
      return;
    }
    const pageButton = event.target.closest('[data-page]');
    if (pageButton && !pageButton.disabled) {
      state.page = Number(pageButton.dataset.page);
      load();
      return;
    }
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      openMemberModal(Number(viewButton.dataset.view), ctx, load);
      return;
    }
    const row = event.target.closest('tr[data-id]');
    if (row) openMemberModal(Number(row.dataset.id), ctx, load);
  });

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchInput.value.trim();
      state.page = 1;
      load();
    }, 280);
  });
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(searchTimer);
      state.q = searchInput.value.trim();
      state.page = 1;
      load();
    }
  });

  typeFilter.addEventListener('change', () => {
    state.type = typeFilter.value;
    state.page = 1;
    load();
  });
  paymentFilter.addEventListener('change', () => {
    state.payment = paymentFilter.value;
    state.page = 1;
    load();
  });

  root.querySelector('#export-btn')?.addEventListener('click', () => {
    const query = new URLSearchParams();
    if (state.q) query.set('q', state.q);
    if (state.type) query.set('type', state.type);
    if (state.payment) query.set('payment', state.payment);
    location.href = `/api/members/export.csv?${query.toString()}`;
  });

  await load();
  if (initialMember) openMemberModal(Number(initialMember), ctx, load);
}

/* ------------------------------ member modal -------------------------- */

async function openMemberModal(id, ctx, onChange) {
  let member;
  try {
    const data = await api.getMember(id);
    member = data.member;
  } catch (error) {
    toast(error.message, 'error');
    return;
  }

  const currency = ctx.settings.currency;
  const isAdmin = ctx.user.role === 'admin';
  const isPaid = member.payment_status === 'paid';

  const { root, close } = openModal(
    `<div class="modal-head">
       <div>
         <p class="eyebrow">Member record</p>
         <h3>${esc(member.full_name)}</h3>
         <p class="muted">${esc(member.member_code)}</p>
       </div>
       <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
     </div>

     <div class="detail-badges">
       ${typeBadge(member.membership_type)}
       ${paymentBadge(member.payment_status)}
       <span class="badge badge-muted">${esc(money(member.amount, currency))}</span>
     </div>

     <dl class="detail-grid">
       <div><dt>Department</dt><dd>${esc(member.department)}</dd></div>
       <div><dt>Roll number</dt><dd class="mono">${esc(member.roll_number)}</dd></div>
       <div><dt>Contact number</dt><dd>${esc(member.contact_number)}</dd></div>
       <div><dt>Receipt number</dt><dd class="mono">${esc(member.receipt_no || '—')}</dd></div>
       <div><dt>Payment mode</dt><dd>${esc(member.payment_mode === 'online' ? 'Online' : 'Cash at desk')}</dd></div>
       <div><dt>Transaction reference</dt><dd class="mono">${esc(member.transaction_ref || '—')}</dd></div>
       <div><dt>Registered by</dt><dd>${esc(member.registered_by_name || '—')}</dd></div>
       <div><dt>Registered on</dt><dd>${esc(fmtDateTime(member.created_at))}</dd></div>
       <div><dt>Paid on</dt><dd>${esc(member.paid_at ? fmtDateTime(member.paid_at) : '—')}</dd></div>
       ${member.notes ? `<div class="span-2"><dt>Notes</dt><dd>${esc(member.notes)}</dd></div>` : ''}
     </dl>

     <div class="modal-actions between">
       <div style="display:flex;gap:8px;flex-wrap:wrap">
         <button type="button" class="btn btn-ghost btn-sm" data-receipt>${icon('receipt')}Receipt</button>
         ${isAdmin ? `<button type="button" class="btn btn-danger-ghost btn-sm" data-delete>${icon('trash')}Delete</button>` : ''}
       </div>
       <div style="display:flex;gap:8px;flex-wrap:wrap">
         <button type="button" class="btn btn-ghost btn-sm" data-edit>${icon('edit')}Edit</button>
         ${
           isPaid
             ? ''
             : `<button type="button" class="btn btn-ghost btn-sm" data-pay-online>${icon('card')}Pay online</button>
                <button type="button" class="btn btn-primary btn-sm" data-collect>${icon('wallet')}Record payment</button>`
         }
       </div>
     </div>`,
    { className: 'modal-lg' }
  );

  root.querySelector('[data-receipt]').addEventListener('click', () => {
    close();
    openReceipt(member, ctx);
  });

  root.querySelector('[data-edit]').addEventListener('click', () => {
    close();
    openEditModal(member, ctx, onChange);
  });

  root.querySelector('[data-collect]')?.addEventListener('click', () => {
    close();
    openPaymentModal(member, ctx, onChange);
  });

  root.querySelector('[data-delete]')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Delete this member?',
      message: `${member.full_name} (${member.member_code}) will be removed from the roster permanently. This cannot be undone.`,
      confirmLabel: 'Delete member',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.deleteMember(member.id);
      toast(`${member.full_name} was removed from the roster.`);
      close();
      onChange();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  root.querySelector('[data-pay-online]')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Record an online payment?',
      message: `This demo checkout will mark ${money(member.amount, currency)} as paid for ${member.full_name} and generate a test transaction reference.`,
      confirmLabel: 'Pay now',
    });
    if (!confirmed) return;
    try {
      const result = await api.payOnline(member.id);
      toast(`Payment recorded — reference ${result.reference}.`);
      close();
      onChange();
    } catch (error) {
      toast(error.message, 'error');
    }
  });
}

/* ------------------------------- edit modal --------------------------- */

function openEditModal(member, ctx, done) {
  const { root, close } = openModal(
    `<div class="modal-head">
       <div><p class="eyebrow">Edit member</p><h3>${esc(member.full_name)}</h3><p class="muted">${esc(member.member_code)}</p></div>
       <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
     </div>
     <form id="edit-member-form" novalidate>
       <p class="form-error" data-form-error role="alert"></p>
       <div class="field-grid">
         <div class="field span-2">
           <label for="edit-name">Full name</label>
           <input id="edit-name" name="full_name" type="text" maxlength="80" value="${esc(member.full_name)}" required />
         </div>
         <div class="field">
           <label for="edit-department">Department</label>
           <input id="edit-department" name="department" type="text" maxlength="80" value="${esc(member.department)}" required />
         </div>
         <div class="field">
           <label for="edit-roll">Roll number</label>
           <input id="edit-roll" name="roll_number" type="text" maxlength="30" value="${esc(member.roll_number)}" spellcheck="false" required />
         </div>
         <div class="field">
           <label for="edit-contact">Contact number</label>
           <input id="edit-contact" name="contact_number" type="tel" maxlength="24" value="${esc(member.contact_number)}" required />
         </div>
         <div class="field">
           <label for="edit-type">Membership plan</label>
           <select id="edit-type" name="membership_type">
             <option value="general" ${member.membership_type === 'general' ? 'selected' : ''}>General</option>
             <option value="executive" ${member.membership_type === 'executive' ? 'selected' : ''}>Executive</option>
           </select>
         </div>
         <div class="field span-2">
           <label for="edit-notes">Notes</label>
           <textarea id="edit-notes" name="notes" maxlength="300">${esc(member.notes || '')}</textarea>
         </div>
       </div>
       <div class="modal-actions">
         <button type="button" class="btn btn-ghost" data-close>Cancel</button>
         <button type="submit" class="btn btn-primary">Save changes</button>
       </div>
     </form>`,
    { className: 'modal-lg' }
  );

  const form = root.querySelector('#edit-member-form');
  const errorEl = root.querySelector('[data-form-error]');
  const submit = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Saving…';

    try {
      await api.updateMember(member.id, {
        full_name: form.elements.full_name.value.trim(),
        department: form.elements.department.value.trim(),
        roll_number: form.elements.roll_number.value.trim(),
        contact_number: form.elements.contact_number.value.trim(),
        membership_type: form.elements.membership_type.value,
        notes: form.elements.notes.value.trim(),
      });
      toast('Member details updated.');
      close();
      done();
    } catch (error) {
      errorEl.textContent = error.message;
      submit.disabled = false;
      submit.textContent = 'Save changes';
    }
  });
}

/* ----------------------------- payment modal -------------------------- */

export function openPaymentModal(member, ctx, onChange) {
  const currency = ctx.settings.currency;
  const onlineDefault = member.payment_mode === 'online';

  const { root, close } = openModal(
    `<div class="modal-head">
       <div>
         <p class="eyebrow">Payment · ${esc(member.member_code)}</p>
         <h3>${esc(member.full_name)}</h3>
         <p class="muted">Record a membership payment collected at the desk.</p>
       </div>
       <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
     </div>

     <div class="summary-total" style="border-top:0;padding-top:0;margin:0 0 18px">
       <span>Membership fee</span>
       <strong>${esc(money(member.amount, currency))}</strong>
     </div>

     <form id="payment-form" novalidate>
       <p class="form-error" data-form-error role="alert"></p>

       <div class="field">
         <span class="field-label">Payment mode</span>
         <div class="segmented">
           <label><input type="radio" name="payment_mode" value="offline" ${onlineDefault ? '' : 'checked'} />Cash at desk</label>
           <label><input type="radio" name="payment_mode" value="online" ${onlineDefault ? 'checked' : ''} />Online</label>
         </div>
       </div>

       <div class="field">
         <span class="field-label">Payment status</span>
         <div class="segmented">
           <label><input type="radio" name="payment_status" value="paid" checked />Paid</label>
           <label><input type="radio" name="payment_status" value="pending" />Pending</label>
         </div>
       </div>

       <div class="field" data-reference>
         <label for="payment-reference">Transaction reference</label>
         <input id="payment-reference" name="transaction_ref" type="text" maxlength="60" spellcheck="false" value="${esc(member.transaction_ref || '')}" placeholder="e.g. BKASH-8F2K19" />
         <span class="hint">Required when marking an online payment paid.</span>
       </div>

       <div class="modal-actions">
         <button type="button" class="btn btn-ghost" data-close>Cancel</button>
         <button type="submit" class="btn btn-primary">Save payment</button>
       </div>
     </form>`
  );

  const form = root.querySelector('#payment-form');
  const errorEl = root.querySelector('[data-form-error]');
  const referenceField = root.querySelector('[data-reference]');
  const referenceInput = root.querySelector('#payment-reference');
  const submit = form.querySelector('button[type="submit"]');

  function selected(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function syncReference() {
    referenceField.style.display = selected('payment_mode') === 'online' ? '' : 'none';
  }

  form.querySelectorAll('input[name="payment_mode"]').forEach((input) => {
    input.addEventListener('change', syncReference);
  });
  syncReference();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const mode = selected('payment_mode');
    const status = selected('payment_status');
    const reference = referenceInput.value.trim();

    if (status === 'paid' && mode === 'online' && !reference) {
      errorEl.textContent = 'Enter the online transaction reference before marking this paid.';
      referenceInput.focus();
      return;
    }
    if (reference && !/^[A-Za-z0-9][A-Za-z0-9\-_/.#]*$/.test(reference)) {
      errorEl.textContent = 'Reference may use letters, numbers, -, _, /, . and # only.';
      referenceInput.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Saving…';

    try {
      await api.recordPayment(member.id, {
        payment_mode: mode,
        payment_status: status,
        transaction_ref: reference,
      });
      toast(
        status === 'paid'
          ? `Payment recorded for ${member.full_name}.`
          : `Payment marked pending for ${member.full_name}.`
      );
      close();
      onChange();
    } catch (error) {
      errorEl.textContent = error.message;
      submit.disabled = false;
      submit.textContent = 'Save payment';
    }
  });
}

/* -------------------------------- receipt ----------------------------- */

export function openReceipt(member, ctx) {
  const currency = ctx.settings.currency;
  const society = ctx.settings.society_name;
  const isPaid = member.payment_status === 'paid';
  const method = member.payment_mode === 'online' ? 'Online payment' : 'Cash at desk';

  const { root } = openModal(
    `<div class="modal-head no-print">
       <div><p class="eyebrow">Membership receipt</p><h3>${esc(member.member_code)}</h3></div>
       <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
     </div>

     <div class="receipt">
       <div class="receipt-head">
         <div>
           <div class="receipt-society">${esc(society)}</div>
           <div class="receipt-sub">Membership receipt</div>
         </div>
         <div class="receipt-code-wrap">
           <div class="receipt-code">${esc(member.receipt_no || '—')}</div>
           <div class="receipt-label">Receipt no.</div>
         </div>
       </div>

       <div class="receipt-grid">
         <div><dt>Member ID</dt><dd class="mono">${esc(member.member_code)}</dd></div>
         <div><dt>Member name</dt><dd>${esc(member.full_name)}</dd></div>
         <div><dt>Roll number</dt><dd>${esc(member.roll_number)}</dd></div>
         <div><dt>Department</dt><dd>${esc(member.department)}</dd></div>
         <div><dt>Contact</dt><dd>${esc(member.contact_number)}</dd></div>
         <div><dt>Membership</dt><dd>${esc(titleCase(member.membership_type))} member</dd></div>
         <div><dt>Payment method</dt><dd>${esc(method)}</dd></div>
         <div><dt>Reference</dt><dd class="mono">${esc(member.transaction_ref || '—')}</dd></div>
         <div><dt>Issued</dt><dd>${esc(fmtDate(member.created_at))}</dd></div>
         <div><dt>${isPaid ? 'Paid on' : 'Status'}</dt><dd>${isPaid ? esc(fmtDate(member.paid_at || member.created_at)) : 'Payment pending'}</dd></div>
       </div>

       <div class="receipt-total">
         <span>${isPaid ? 'Amount paid' : 'Amount due'}</span>
         <strong>${esc(money(member.amount, currency))}</strong>
         <span class="receipt-stamp ${isPaid ? '' : 'due'}">${isPaid ? 'PAID' : 'DUE'}</span>
       </div>

       <div class="receipt-foot">
         <div>Received by ${esc(member.registered_by_name || 'the desk')}</div>
         <div class="receipt-sign">Authorised signature</div>
       </div>
       <p class="receipt-note">Receipt ${esc(member.receipt_no || '—')} · Computer-generated receipt from ${esc(society)}. Keep this for your records.</p>
     </div>

     <div class="modal-actions no-print">
       <button type="button" class="btn btn-ghost" data-close>Close</button>
       <button type="button" class="btn btn-primary" data-print>${icon('print')}Print receipt</button>
     </div>`,
    { className: 'modal-lg' }
  );

  root.querySelector('[data-print]').addEventListener('click', () => window.print());
}
