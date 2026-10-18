import { Modal } from './Modal';
import { Icon } from './Icon';
import { fmtDate, money, titleCase } from '../lib/format';

export function ReceiptModal({ member, settings, onClose }) {
  const currency = settings.currency;
  const society = settings.society_name;
  const isPaid = member.payment_status === 'paid';
  const method = member.payment_mode === 'online' ? 'Online payment' : 'Cash at desk';

  return (
    <Modal className="modal-lg" onClose={onClose}>
      <div className="modal-head no-print">
        <div>
          <p className="eyebrow">Membership receipt</p>
          <h3>{member.member_code}</h3>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <div className="receipt">
        <div className="receipt-head">
          <div>
            <div className="receipt-society">{society}</div>
            <div className="receipt-sub">Membership receipt</div>
          </div>
          <div className="receipt-code-wrap">
            <div className="receipt-code">{member.receipt_no || '—'}</div>
            <div className="receipt-label">Receipt no.</div>
          </div>
        </div>

        <div className="receipt-grid">
          <div>
            <dt>Member ID</dt>
            <dd className="mono">{member.member_code}</dd>
          </div>
          <div>
            <dt>Member name</dt>
            <dd>{member.full_name}</dd>
          </div>
          <div>
            <dt>Roll number</dt>
            <dd>{member.roll_number}</dd>
          </div>
          <div>
            <dt>Department</dt>
            <dd>{member.department}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>{member.contact_number}</dd>
          </div>
          <div>
            <dt>Membership</dt>
            <dd>{titleCase(member.membership_type)} member</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>{method}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd className="mono">{member.transaction_ref || '—'}</dd>
          </div>
          <div>
            <dt>Issued</dt>
            <dd>{fmtDate(member.created_at)}</dd>
          </div>
          <div>
            <dt>{isPaid ? 'Paid on' : 'Status'}</dt>
            <dd>{isPaid ? fmtDate(member.paid_at || member.created_at) : 'Payment pending'}</dd>
          </div>
        </div>

        <div className="receipt-total">
          <span>{isPaid ? 'Amount paid' : 'Amount due'}</span>
          <strong>{money(member.amount, currency)}</strong>
          <span className={`receipt-stamp ${isPaid ? '' : 'due'}`.trim()}>
            {isPaid ? 'PAID' : 'DUE'}
          </span>
        </div>

        <div className="receipt-foot">
          <div>Received by {member.registered_by_name || 'the desk'}</div>
          <div className="receipt-sign">Authorised signature</div>
        </div>
        <p className="receipt-note">
          Receipt {member.receipt_no || '—'} · Computer-generated receipt from {society}. Keep this
          for your records.
        </p>
      </div>

      <div className="modal-actions no-print">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="print" />
          Print receipt
        </button>
      </div>
    </Modal>
  );
}
