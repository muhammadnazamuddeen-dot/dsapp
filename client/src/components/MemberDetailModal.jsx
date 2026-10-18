import { useState } from 'react';
import { api } from '../api';
import { useConfirm, useToast } from '../context/UIContext';
import { fmtDateTime, money } from '../lib/format';
import { PaymentBadge, TypeBadge } from './Badges';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function MemberDetailModal({
  member,
  currency,
  isAdmin,
  onClose,
  onEdit,
  onPayment,
  onReceipt,
  onDeleted,
  onPaid,
}) {
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const isPaid = member.payment_status === 'paid';

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Delete this member?',
      message: `${member.full_name} (${member.member_code}) will be removed from the roster permanently. This cannot be undone.`,
      confirmLabel: 'Delete member',
      danger: true,
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      await api.deleteMember(member.id);
      toast(`${member.full_name} was removed from the roster.`);
      onDeleted();
    } catch (error) {
      toast(error.message, 'error');
      setBusy(false);
    }
  }

  async function handlePayOnline() {
    const confirmed = await confirm({
      title: 'Record an online payment?',
      message: `This demo checkout will mark ${money(member.amount, currency)} as paid for ${member.full_name} and generate a test transaction reference.`,
      confirmLabel: 'Pay now',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await api.payOnline(member.id);
      toast(`Payment recorded — reference ${result.reference}.`);
      onPaid();
    } catch (error) {
      toast(error.message, 'error');
      setBusy(false);
    }
  }

  return (
    <Modal className="modal-lg" onClose={onClose}>
      <div className="modal-head">
        <div>
          <p className="eyebrow">Member record</p>
          <h3>{member.full_name}</h3>
          <p className="muted">{member.member_code}</p>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <div className="detail-badges">
        <TypeBadge type={member.membership_type} />
        <PaymentBadge status={member.payment_status} />
        <span className="badge badge-muted">{money(member.amount, currency)}</span>
      </div>

      <dl className="detail-grid">
        <div>
          <dt>Department</dt>
          <dd>{member.department}</dd>
        </div>
        <div>
          <dt>Roll number</dt>
          <dd className="mono">{member.roll_number}</dd>
        </div>
        <div>
          <dt>Contact number</dt>
          <dd>{member.contact_number}</dd>
        </div>
        <div>
          <dt>Receipt number</dt>
          <dd className="mono">{member.receipt_no || '—'}</dd>
        </div>
        <div>
          <dt>Payment mode</dt>
          <dd>{member.payment_mode === 'online' ? 'Online' : 'Cash at desk'}</dd>
        </div>
        <div>
          <dt>Transaction reference</dt>
          <dd className="mono">{member.transaction_ref || '—'}</dd>
        </div>
        <div>
          <dt>Registered by</dt>
          <dd>{member.registered_by_name || '—'}</dd>
        </div>
        <div>
          <dt>Registered on</dt>
          <dd>{fmtDateTime(member.created_at)}</dd>
        </div>
        <div>
          <dt>Paid on</dt>
          <dd>{member.paid_at ? fmtDateTime(member.paid_at) : '—'}</dd>
        </div>
        {member.notes && (
          <div className="span-2">
            <dt>Notes</dt>
            <dd>{member.notes}</dd>
          </div>
        )}
      </dl>

      <div className="modal-actions between">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onReceipt}>
            <Icon name="receipt" />
            Receipt
          </button>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-danger-ghost btn-sm"
              onClick={handleDelete}
              disabled={busy}
            >
              <Icon name="trash" />
              Delete
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Icon name="edit" />
            Edit
          </button>
          {!isPaid && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handlePayOnline}
                disabled={busy}
              >
                <Icon name="card" />
                Pay online
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={onPayment}>
                <Icon name="wallet" />
                Record payment
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
