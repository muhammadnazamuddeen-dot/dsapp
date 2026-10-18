import { api } from '../api.js';
import { esc, icon, money, toast } from '../ui.js';
import { openReceipt } from './members.js';

export async function registerView(root, ctx) {
  const { settings, user } = ctx;
  const currency = settings.currency;
  const fees = { general: settings.general_fee, executive: settings.executive_fee };

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">New registration</p>
        <h1>Register a member</h1>
        <p class="muted">Add a general or executive member to the society roster and record their membership fee.</p>
      </div>
      <div class="page-head-actions">
        <span class="pill-note">${icon('user')}Desk: ${esc(user.full_name)}</span>
      </div>
    </div>

    <form id="registration-form" novalidate>
      <div class="register-grid">
        <div class="stack">
          <section class="panel">
            <div class="section-label">
              <span class="section-step">1</span>
              <div><h2>Member details</h2><p>As they appear on the student ID card</p></div>
            </div>
            <p class="form-error" id="register-error" role="alert"></p>
            <div class="field-grid">
              <div class="field span-2" data-field="full_name">
                <label for="full_name">Full name</label>
                <input id="full_name" name="full_name" type="text" autocomplete="name" placeholder="e.g. Ayesha Rahman" maxlength="80" required />
                <span class="field-error"></span>
              </div>
              <div class="field" data-field="department">
                <label for="department">Department</label>
                <input id="department" name="department" type="text" placeholder="e.g. Computer Science" maxlength="80" required />
                <span class="field-error"></span>
              </div>
              <div class="field" data-field="roll_number">
                <label for="roll_number">Roll number</label>
                <input id="roll_number" name="roll_number" type="text" placeholder="e.g. CSE-2023/045" maxlength="30" spellcheck="false" required />
                <span class="field-error"></span>
              </div>
              <div class="field span-2" data-field="contact_number">
                <label for="contact_number">Contact number</label>
                <input id="contact_number" name="contact_number" type="tel" inputmode="tel" placeholder="e.g. 01712 345678" maxlength="24" autocomplete="tel" required />
                <span class="field-error"></span>
              </div>
            </div>
          </section>

          <section class="panel">
            <div class="section-label">
              <span class="section-step">2</span>
              <div><h2>Membership plan</h2><p>Fees come from the society settings</p></div>
            </div>
            <div class="radio-cards" id="plan-cards">
              <label class="radio-card">
                <input type="radio" name="membership_type" value="general" checked />
                <div class="radio-title">
                  <span>General member</span>
                  <span class="radio-check"></span>
                </div>
                <div class="radio-desc">Open to every student. Full access to regular debates and workshops.</div>
                <div class="radio-price" style="margin-top:10px">${esc(money(fees.general, currency))}</div>
              </label>
              <label class="radio-card">
                <input type="radio" name="membership_type" value="executive" />
                <div class="radio-title">
                  <span>Executive member</span>
                  <span class="radio-check"></span>
                </div>
                <div class="radio-desc">Core team and office bearers. Includes organising duties.</div>
                <div class="radio-price" style="margin-top:10px">${esc(money(fees.executive, currency))}</div>
              </label>
            </div>
          </section>

          <section class="panel">
            <div class="section-label">
              <span class="section-step">3</span>
              <div><h2>Payment</h2><p>Record how the membership fee is collected</p></div>
            </div>
            <div class="field">
              <span class="field-label">Payment mode</span>
              <div class="radio-cards">
                <label class="radio-card">
                  <input type="radio" name="payment_mode" value="offline" checked />
                  <div class="radio-title"><span>At the desk</span><span class="radio-check"></span></div>
                  <div class="radio-desc">Cash handed over to the desk member.</div>
                </label>
                <label class="radio-card">
                  <input type="radio" name="payment_mode" value="online" />
                  <div class="radio-title"><span>Online</span><span class="radio-check"></span></div>
                  <div class="radio-desc">Mobile wallet, card or bank transfer.</div>
                </label>
              </div>
            </div>

            <div class="field">
              <span class="field-label">Payment status</span>
              <div class="segmented" id="payment-status">
                <label><input type="radio" name="payment_status" value="paid" checked />Paid</label>
                <label><input type="radio" name="payment_status" value="pending" />Pending</label>
              </div>
            </div>

            <div class="field" id="reference-field" style="display:none">
              <label for="transaction_ref">Online transaction reference</label>
              <input id="transaction_ref" name="transaction_ref" type="text" placeholder="e.g. BKASH-8F2K19" maxlength="60" spellcheck="false" />
              <span class="hint">Leave blank and the desk will get a demo reference automatically.</span>
            </div>

            <div class="field">
              <label for="notes">Notes <span class="muted" style="font-weight:400">(optional)</span></label>
              <textarea id="notes" name="notes" maxlength="300" placeholder="Anything the desk should know about this registration"></textarea>
            </div>

            <div class="form-note">
              ${icon('info')}
              <span>Every registration creates a unique member ID (DS-YEAR-0001) and a printable receipt. Online payments are recorded by the desk with their transaction reference — the demo gateway on the member record can stand in until a real gateway is connected.</span>
            </div>
          </section>
        </div>

        <aside class="register-aside">
          <div class="panel summary-card">
            <p class="eyebrow">Summary</p>
            <div class="summary-type" id="summary-type">General member</div>
            <div class="summary-row"><span>Membership fee</span><strong id="summary-fee">${esc(money(fees.general, currency))}</strong></div>
            <div class="summary-row"><span>Payment</span><strong id="summary-payment">At the desk · Paid</strong></div>
            <div class="summary-total"><span id="summary-total-label">Amount due</span><strong id="summary-total">${esc(money(fees.general, currency))}</strong></div>
            <button class="btn btn-primary btn-block" type="submit" id="register-submit">Register member</button>
            <p class="form-hint">The member is added to the roster immediately.</p>
          </div>

          <div class="panel help-card">
            <h3>Desk checklist</h3>
            <ul>
              <li>Confirm the roll number against the student ID.</li>
              <li>Count cash before marking an offline payment paid.</li>
              <li>For online payments, copy the transaction reference exactly.</li>
              <li>Hand the printed receipt to the member.</li>
            </ul>
          </div>
        </aside>
      </div>
    </form>`;

  const form = root.querySelector('#registration-form');
  const summaryType = root.querySelector('#summary-type');
  const summaryFee = root.querySelector('#summary-fee');
  const summaryPayment = root.querySelector('#summary-payment');
  const summaryTotal = root.querySelector('#summary-total');
  const summaryTotalLabel = root.querySelector('#summary-total-label');
  const referenceField = root.querySelector('#reference-field');
  const submitButton = root.querySelector('#register-submit');
  const formError = root.querySelector('#register-error');

  function selected(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value;
  }

  function syncSummary() {
    const type = selected('membership_type') || 'general';
    const mode = selected('payment_mode') || 'offline';
    const status = selected('payment_status') || 'paid';
    const fee = fees[type] ?? 0;

    summaryType.textContent = type === 'executive' ? 'Executive member' : 'General member';
    summaryFee.textContent = money(fee, currency);
    summaryTotal.textContent = money(fee, currency);
    summaryTotalLabel.textContent = status === 'paid' ? 'Collected' : 'Amount due';
    summaryPayment.textContent = `${mode === 'online' ? 'Online' : 'At the desk'} · ${status === 'paid' ? 'Paid' : 'Pending'}`;
    referenceField.style.display = mode === 'online' ? '' : 'none';
  }

  form.querySelectorAll('input[name="membership_type"], input[name="payment_mode"], input[name="payment_status"]').forEach((input) => {
    input.addEventListener('change', syncSummary);
  });
  syncSummary();

  function fieldError(name, message) {
    const wrapper = form.querySelector(`[data-field="${name}"]`);
    if (!wrapper) return;
    const input = wrapper.querySelector('input, textarea, select');
    const errorEl = wrapper.querySelector('.field-error');
    if (message) {
      wrapper.classList.add('has-error');
      input?.classList.add('is-invalid');
      if (errorEl) errorEl.textContent = message;
    } else {
      wrapper.classList.remove('has-error');
      input?.classList.remove('is-invalid');
      if (errorEl) errorEl.textContent = '';
    }
  }

  form.querySelectorAll('input, textarea').forEach((input) => {
    input.addEventListener('input', () => {
      const field = input.closest('[data-field]');
      if (field) fieldError(field.dataset.field, '');
      formError.textContent = '';
    });
  });

  function validate(values) {
    let ok = true;
    for (const name of ['full_name', 'department', 'roll_number', 'contact_number']) {
      fieldError(name, '');
    }

    if (values.full_name.length < 2) {
      fieldError('full_name', 'Enter the member’s full name.');
      ok = false;
    }
    if (values.department.length < 2) {
      fieldError('department', 'Enter a department.');
      ok = false;
    }
    if (!values.roll_number) {
      fieldError('roll_number', 'Roll number is required.');
      ok = false;
    } else if (!/^[A-Za-z0-9][A-Za-z0-9/\-_. ]{0,29}$/.test(values.roll_number)) {
      fieldError('roll_number', 'Use letters, numbers, /, - or _ only.');
      ok = false;
    }
    const digits = values.contact_number.replace(/[\s\-().]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(digits)) {
      fieldError('contact_number', 'Enter a valid contact number (7–15 digits).');
      ok = false;
    }
    return ok;
  }

  function showSuccess(member) {
    const planLabel = member.membership_type === 'executive' ? 'executive' : 'general';
    root.innerHTML = `
      <div class="page-head">
        <div>
          <p class="eyebrow">New registration</p>
          <h1>Member registered</h1>
        </div>
      </div>
      <div class="panel success-card">
        <div class="success-icon">${icon('check')}</div>
        <p class="eyebrow">Welcome to the society</p>
        <h1>${esc(member.full_name)} is now a ${esc(planLabel)} member</h1>
        <p class="muted">Their membership ID and receipt serial are ready. Hand over the receipt and keep a copy at the desk.</p>
        <div class="success-code">${esc(member.member_code)}</div>
        <p class="small muted" style="margin:6px 0 2px">Receipt no. <span class="mono">${esc(member.receipt_no || '—')}</span></p>
        <div class="summary-row" style="justify-content:center;gap:18px">
          <span>${esc(member.department)} · ${esc(member.roll_number)}</span>
          <span>${member.payment_status === 'paid' ? 'Fee paid' : 'Fee pending'}: <strong>${esc(money(member.amount, currency))}</strong></span>
        </div>
        <div class="success-actions">
          <button class="btn btn-primary" type="button" data-print-receipt>${icon('print')}Print receipt</button>
          <button class="btn btn-ghost" type="button" data-register-another>Register another</button>
          <a class="btn btn-ghost" href="#/members">View members</a>
        </div>
      </div>`;

    root.querySelector('[data-print-receipt]').addEventListener('click', () => openReceipt(member, ctx));
    root.querySelector('[data-register-another]').addEventListener('click', () => ctx.reload());
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    formError.textContent = '';

    const values = {
      full_name: form.elements.full_name.value.trim(),
      department: form.elements.department.value.trim(),
      roll_number: form.elements.roll_number.value.trim(),
      contact_number: form.elements.contact_number.value.trim(),
      membership_type: selected('membership_type') || 'general',
      payment_mode: selected('payment_mode') || 'offline',
      payment_status: selected('payment_status') || 'paid',
      transaction_ref: form.elements.transaction_ref.value.trim(),
      notes: form.elements.notes.value.trim(),
    };

    if (!validate(values)) {
      formError.textContent = 'Please fix the highlighted fields.';
      form.querySelector('.has-error input, .has-error textarea')?.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Registering…';

    try {
      const { member } = await api.createMember(values);
      toast(`${member.full_name} registered as ${member.member_code}.`);
      showSuccess(member);
    } catch (error) {
      formError.textContent = error.message;
      submitButton.disabled = false;
      submitButton.textContent = 'Register member';
      if (error.status === 409) {
        fieldError('roll_number', error.message);
        form.elements.roll_number.focus();
      } else {
        toast(error.message, 'error');
      }
    }
  });
}
