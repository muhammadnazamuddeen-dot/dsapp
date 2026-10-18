export function TypeBadge({ type }) {
  const label = type === 'executive' ? 'Executive' : 'General';
  return (
    <span className={`badge badge-${type}`}>
      <span className="dot" />
      {label}
    </span>
  );
}

export function PaymentBadge({ status }) {
  const paid = status === 'paid';
  return (
    <span className={`badge badge-${paid ? 'paid' : 'pending'}`}>
      <span className="dot" />
      {paid ? 'Paid' : 'Pending'}
    </span>
  );
}

export function RoleBadge({ role }) {
  return role === 'admin' ? (
    <span className="badge badge-executive">Administrator</span>
  ) : (
    <span className="badge badge-general">Desk member</span>
  );
}

export function ActiveBadge({ active }) {
  return (
    <span className={`badge badge-${active ? 'paid' : 'pending'}`}>
      <span className="dot" />
      {active ? 'Active' : 'Disabled'}
    </span>
  );
}
