import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/UIContext';
import { Icon } from '../components/Icon';
import { ReceiptModal } from '../components/ReceiptModal';
import { money } from '../lib/format';

const EMPTY_FORM = {
  full_name: '',
  department: '',
  roll_number: '',
  contact_number: '',
  membership_type: 'general',
  payment_mode: 'offline',
  payment_status: 'paid',
  transaction_ref: '',
  notes: '',
};

export function RegisterPage() {
  const { settings, user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const currency = settings.currency;
  const fees = { general: Number(settings.general_fee), executive: Number(settings.executive_fee) };
  const fee = fees[form.membership_type] ?? 0;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setFormError('');
  }

  function validate() {
    const next = {};
    if (form.full_name.trim().length < 2) next.full_name = 'Enter the member’s full name.';
    if (form.department.trim().length < 2) next.department = 'Enter a department.';

    const roll = form.roll_number.trim();
    if (!roll) next.roll_number = 'Roll number is required.';
    else if (!/^[A-Za-z0-9][A-Za-z0-9/\-_. ]{0,29}$/.test(roll)) {
      next.roll_number = 'Use letters, numbers, /, - or _ only.';
    }

    const digits = form.contact_number.replace(/[\s\-().]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(digits)) {
      next.contact_number = 'Enter a valid contact number (7–15 digits).';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) {
      setFormError('Please fix the highlighted fields.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.createMember({
        full_name: form.full_name.trim(),
        department: form.department.trim(),
        roll_number: form.roll_number.trim(),
        contact_number: form.contact_number.trim(),
        membership_type: form.membership_type,
        payment_mode: form.payment_mode,
        payment_status: form.payment_status,
        transaction_ref: form.transaction_ref.trim(),
        notes: form.notes.trim(),
      });
      toast(`${response.member.full_name} registered as ${response.member.member_code}.`);
      setCreated(response.member);
    } catch (error) {
      if (error.status === 409) {
        setErrors((current) => ({ ...current, roll_number: error.message }));
      } else {
        setFormError(error.message);
        toast(error.message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError('');
    setCreated(null);
    setReceiptOpen(false);
  }

  if (created) {
    return (
      <>
        <div className="page-head">
          <div>
            <p className="eyebrow">New registration</p>
            <h1>Member registered</h1>
          </div>
        </div>
        <div className="panel success-card">
          <div className="success-icon">
            <Icon name="check" />
          </div>
          <p className="eyebrow">Welcome to the society</p>
          <h1>
            {created.full_name} is now a{' '}
            {created.membership_type === 'executive' ? 'executive' : 'general'} member
          </h1>
          <p className="muted">
            Their membership ID and receipt serial are ready. Hand over the receipt and keep a copy
            at the desk.
          </p>
          <div className="success-code">{created.member_code}</div>
          <p className="small muted" style={{ margin: '6px 0 2px' }}>
            Receipt no. <span className="mono">{created.receipt_no || '—'}</span>
          </p>
          <div className="summary-row" style={{ justifyContent: 'center', gap: 18 }}>
            <span>
              {created.department} · {created.roll_number}
            </span>
            <span>
              {created.payment_status === 'paid' ? 'Fee paid' : 'Fee pending'}:{' '}
              <strong>{money(created.amount, currency)}</strong>
            </span>
          </div>
          <div className="success-actions">
            <button className="btn btn-primary" type="button" onClick={() => setReceiptOpen(true)}>
              <Icon name="print" />
              Print receipt
            </button>
            <button className="btn btn-ghost" type="button" onClick={resetForm}>
              Register another
            </button>
            <Link className="btn btn-ghost" to="/members">
              View members
            </Link>
          </div>
        </div>

        {receiptOpen && (
          <ReceiptModal
            member={created}
            settings={settings}
            onClose={() => setReceiptOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="page-head">
        <div>
          <p className="eyebrow">New registration</p>
          <h1>Register a member</h1>
          <p className="muted">
            Add a general or executive member to the society roster and record their membership
            fee.
          </p>
        </div>
        <div className="page-head-actions">
          <span className="pill-note">
            <Icon name="user" />
            Desk: {user.full_name}
          </span>
        </div>
      </div>

      <div className="register-grid">
        <div className="stack">
          <section className="panel">
            <div className="section-label">
              <span className="section-step">1</span>
              <div>
                <h2>Member details</h2>
                <p>As they appear on the student ID card</p>
              </div>
            </div>
            <p className="form-error" role="alert">
              {formError}
            </p>
            <div className="field-grid">
              <div className={`field span-2 ${errors.full_name ? 'has-error' : ''}`.trim()}>
                <label htmlFor="full_name">Full name</label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Ayesha Rahman"
                  maxLength={80}
                  value={form.full_name}
                  onChange={(event) => update('full_name', event.target.value)}
                  required
                />
                <span className="field-error">{errors.full_name}</span>
              </div>
              <div className={`field ${errors.department ? 'has-error' : ''}`.trim()}>
                <label htmlFor="department">Department</label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="e.g. Computer Science"
                  maxLength={80}
                  value={form.department}
                  onChange={(event) => update('department', event.target.value)}
                  required
                />
                <span className="field-error">{errors.department}</span>
              </div>
              <div className={`field ${errors.roll_number ? 'has-error' : ''}`.trim()}>
                <label htmlFor="roll_number">Roll number</label>
                <input
                  id="roll_number"
                  name="roll_number"
                  type="text"
                  placeholder="e.g. CSE-2023/045"
                  maxLength={30}
                  spellCheck={false}
                  value={form.roll_number}
                  onChange={(event) => update('roll_number', event.target.value)}
                  required
                />
                <span className="field-error">{errors.roll_number}</span>
              </div>
              <div className={`field span-2 ${errors.contact_number ? 'has-error' : ''}`.trim()}>
                <label htmlFor="contact_number">Contact number</label>
                <input
                  id="contact_number"
                  name="contact_number"
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 01712 345678"
                  maxLength={24}
                  autoComplete="tel"
                  value={form.contact_number}
                  onChange={(event) => update('contact_number', event.target.value)}
                  required
                />
                <span className="field-error">{errors.contact_number}</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-label">
              <span className="section-step">2</span>
              <div>
                <h2>Membership plan</h2>
                <p>Fees come from the society settings</p>
              </div>
            </div>
            <div className="radio-cards">
              <label className="radio-card">
                <input
                  type="radio"
                  name="membership_type"
                  value="general"
                  checked={form.membership_type === 'general'}
                  onChange={() => update('membership_type', 'general')}
                />
                <div className="radio-title">
                  <span>General member</span>
                  <span className="radio-check" />
                </div>
                <div className="radio-desc">
                  Open to every student. Full access to regular debates and workshops.
                </div>
                <div className="radio-price" style={{ marginTop: 10 }}>
                  {money(fees.general, currency)}
                </div>
              </label>
              <label className="radio-card">
                <input
                  type="radio"
                  name="membership_type"
                  value="executive"
                  checked={form.membership_type === 'executive'}
                  onChange={() => update('membership_type', 'executive')}
                />
                <div className="radio-title">
                  <span>Executive member</span>
                  <span className="radio-check" />
                </div>
                <div className="radio-desc">
                  Core team and office bearers. Includes organising duties.
                </div>
                <div className="radio-price" style={{ marginTop: 10 }}>
                  {money(fees.executive, currency)}
                </div>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="section-label">
              <span className="section-step">3</span>
              <div>
                <h2>Payment</h2>
                <p>Record how the membership fee is collected</p>
              </div>
            </div>
            <div className="field">
              <span className="field-label">Payment mode</span>
              <div className="radio-cards">
                <label className="radio-card">
                  <input
                    type="radio"
                    name="payment_mode"
                    value="offline"
                    checked={form.payment_mode === 'offline'}
                    onChange={() => update('payment_mode', 'offline')}
                  />
                  <div className="radio-title">
                    <span>At the desk</span>
                    <span className="radio-check" />
                  </div>
                  <div className="radio-desc">Cash handed over to the desk member.</div>
                </label>
                <label className="radio-card">
                  <input
                    type="radio"
                    name="payment_mode"
                    value="online"
                    checked={form.payment_mode === 'online'}
                    onChange={() => update('payment_mode', 'online')}
                  />
                  <div className="radio-title">
                    <span>Online</span>
                    <span className="radio-check" />
                  </div>
                  <div className="radio-desc">Mobile wallet, card or bank transfer.</div>
                </label>
              </div>
            </div>

            <div className="field">
              <span className="field-label">Payment status</span>
              <div className="segmented">
                <label>
                  <input
                    type="radio"
                    name="payment_status"
                    value="paid"
                    checked={form.payment_status === 'paid'}
                    onChange={() => update('payment_status', 'paid')}
                  />
                  Paid
                </label>
                <label>
                  <input
                    type="radio"
                    name="payment_status"
                    value="pending"
                    checked={form.payment_status === 'pending'}
                    onChange={() => update('payment_status', 'pending')}
                  />
                  Pending
                </label>
              </div>
            </div>

            {form.payment_mode === 'online' && (
              <div className="field">
                <label htmlFor="transaction_ref">Online transaction reference</label>
                <input
                  id="transaction_ref"
                  name="transaction_ref"
                  type="text"
                  placeholder="e.g. BKASH-8F2K19"
                  maxLength={60}
                  spellCheck={false}
                  value={form.transaction_ref}
                  onChange={(event) => update('transaction_ref', event.target.value)}
                />
                <span className="hint">
                  Leave blank and the desk will get a demo reference automatically.
                </span>
              </div>
            )}

            <div className="field">
              <label htmlFor="notes">
                Notes <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                maxLength={300}
                placeholder="Anything the desk should know about this registration"
                value={form.notes}
                onChange={(event) => update('notes', event.target.value)}
              />
            </div>

            <div className="form-note">
              <Icon name="info" />
              <span>
                Every registration creates a unique member ID (DS-YEAR-0001) and a printable
                receipt. Online payments are recorded by the desk with their transaction reference
                — the demo gateway on the member record can stand in until a real gateway is
                connected.
              </span>
            </div>
          </section>
        </div>

        <aside className="register-aside">
          <div className="panel summary-card">
            <p className="eyebrow">Summary</p>
            <div className="summary-type">
              {form.membership_type === 'executive' ? 'Executive member' : 'General member'}
            </div>
            <div className="summary-row">
              <span>Membership fee</span>
              <strong>{money(fee, currency)}</strong>
            </div>
            <div className="summary-row">
              <span>Payment</span>
              <strong>
                {form.payment_mode === 'online' ? 'Online' : 'At the desk'} ·{' '}
                {form.payment_status === 'paid' ? 'Paid' : 'Pending'}
              </strong>
            </div>
            <div className="summary-total">
              <span>{form.payment_status === 'paid' ? 'Collected' : 'Amount due'}</span>
              <strong>{money(fee, currency)}</strong>
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Registering…' : 'Register member'}
            </button>
            <p className="form-hint">The member is added to the roster immediately.</p>
          </div>

          <div className="panel help-card">
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
    </form>
  );
}
