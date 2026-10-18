import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/UIContext';
import { money } from '../lib/format';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function PaymentModal({ member, currency, onClose, onSaved }) {
  const toast = useToast();
  const [mode, setMode] = useState(member.payment_mode === 'online' ? 'online' : 'offline');
  const [status, setStatus] = useState('paid');
  const [reference, setReference] = useState(member.transaction_ref || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const cleanReference = reference.trim();
    if (status === 'paid' && mode === 'online' && !cleanReference) {
      setError('Enter the online transaction reference before marking this paid.');
      return;
    }
    if (cleanReference && !/^[A-Za-z0-9][A-Za-z0-9\-_/.#]*$/.test(cleanReference)) {
      setError('Reference may use letters, numbers, -, _, /, . and # only.');
      return;
    }

    setSubmitting(true);
    try {
      await api.recordPayment(member.id, {
        payment_mode: mode,
        payment_status: status,
        transaction_ref: cleanReference,
      });
      toast(
        status === 'paid'
          ? `Payment recorded for ${member.full_name}.`
          : `Payment marked pending for ${member.full_name}.`
      );
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
          <p className="eyebrow">Payment · {member.member_code}</p>
          <h3>{member.full_name}</h3>
          <p className="muted">Record a membership payment collected at the desk.</p>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <div className="summary-total" style={{ borderTop: 0, paddingTop: 0, margin: '0 0 18px' }}>
        <span>Membership fee</span>
        <strong>{money(member.amount, currency)}</strong>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <p className="form-error" role="alert">
          {error}
        </p>

        <div className="field">
          <span className="field-label">Payment mode</span>
          <div className="segmented">
            <label>
              <input
                type="radio"
                name="payment_mode"
                value="offline"
                checked={mode === 'offline'}
                onChange={() => setMode('offline')}
              />
              Cash at desk
            </label>
            <label>
              <input
                type="radio"
                name="payment_mode"
                value="online"
                checked={mode === 'online'}
                onChange={() => setMode('online')}
              />
              Online
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
                checked={status === 'paid'}
                onChange={() => setStatus('paid')}
              />
              Paid
            </label>
            <label>
              <input
                type="radio"
                name="payment_status"
                value="pending"
                checked={status === 'pending'}
                onChange={() => setStatus('pending')}
              />
              Pending
            </label>
          </div>
        </div>

        {mode === 'online' && (
          <div className="field">
            <label htmlFor="payment-reference">Transaction reference</label>
            <input
              id="payment-reference"
              name="transaction_ref"
              type="text"
              maxLength={60}
              spellCheck={false}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e.g. BKASH-8F2K19"
            />
            <span className="hint">Required when marking an online payment paid.</span>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
