import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/UIContext';
import { Icon } from './Icon';
import { Modal } from './Modal';

export function MemberEditModal({ member, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    full_name: member.full_name,
    department: member.department,
    roll_number: member.roll_number,
    contact_number: member.contact_number,
    membership_type: member.membership_type,
    notes: member.notes || '',
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
    setSubmitting(true);
    try {
      await api.updateMember(member.id, {
        full_name: form.full_name.trim(),
        department: form.department.trim(),
        roll_number: form.roll_number.trim(),
        contact_number: form.contact_number.trim(),
        membership_type: form.membership_type,
        notes: form.notes.trim(),
      });
      toast('Member details updated.');
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
      setSubmitting(false);
    }
  }

  return (
    <Modal className="modal-lg" onClose={onClose}>
      <div className="modal-head">
        <div>
          <p className="eyebrow">Edit member</p>
          <h3>{member.full_name}</h3>
          <p className="muted">{member.member_code}</p>
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
            <label htmlFor="edit-name">Full name</label>
            <input
              id="edit-name"
              name="full_name"
              type="text"
              maxLength={80}
              value={form.full_name}
              onChange={(event) => update('full_name', event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-department">Department</label>
            <input
              id="edit-department"
              name="department"
              type="text"
              maxLength={80}
              value={form.department}
              onChange={(event) => update('department', event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-roll">Roll number</label>
            <input
              id="edit-roll"
              name="roll_number"
              type="text"
              maxLength={30}
              spellCheck={false}
              value={form.roll_number}
              onChange={(event) => update('roll_number', event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-contact">Contact number</label>
            <input
              id="edit-contact"
              name="contact_number"
              type="tel"
              maxLength={24}
              value={form.contact_number}
              onChange={(event) => update('contact_number', event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-type">Membership plan</label>
            <select
              id="edit-type"
              name="membership_type"
              value={form.membership_type}
              onChange={(event) => update('membership_type', event.target.value)}
            >
              <option value="general">General</option>
              <option value="executive">Executive</option>
            </select>
          </div>
          <div className="field span-2">
            <label htmlFor="edit-notes">Notes</label>
            <textarea
              id="edit-notes"
              name="notes"
              maxLength={300}
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
