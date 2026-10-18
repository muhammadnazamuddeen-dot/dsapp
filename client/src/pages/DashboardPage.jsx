import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/UIContext';
import { Icon } from '../components/Icon';
import { PaymentBadge, TypeBadge } from '../components/Badges';
import { ErrorPanel, PageLoading } from '../components/States';
import { PaymentModal } from '../components/PaymentModal';
import { fmtDate, greeting, initials, money, todayLabel } from '../lib/format';

export function DashboardPage() {
  const { user, settings, brand } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payMember, setPayMember] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResponse, pendingResponse] = await Promise.all([
        api.stats(),
        api.listMembers({ payment: 'pending', limit: 5 }),
      ]);
      setData(statsResponse);
      setPending(pendingResponse);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function collectPayment(memberId) {
    try {
      const response = await api.getMember(memberId);
      setPayMember(response.member);
    } catch (requestError) {
      toast(requestError.message, 'error');
    }
  }

  if (loading) return <PageLoading label="Loading dashboard…" />;
  if (error) return <ErrorPanel message={error} onRetry={load} />;
  if (!data || !pending) return null;

  const { totals, recent, departments } = data;
  const currency = settings.currency;
  const firstName = String(user.full_name || 'there').split(/\s+/)[0];
  const executiveShare = totals.total ? Math.round((totals.executive / totals.total) * 100) : 0;
  const maxDept = departments.reduce((max, row) => Math.max(max, row.count), 0) || 1;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Overview · {todayLabel()}</p>
          <h1>
            {greeting()}, {firstName}
          </h1>
          <p className="muted">Here is how membership at {brand.society_name} is going.</p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-ghost" to="/members?payment=pending">
            Review pending
          </Link>
          <Link className="btn btn-primary" to="/register">
            <Icon name="plus" />
            Register member
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-icon ink">
              <Icon name="users" />
            </span>
          </div>
          <div className="stat-value">{totals.total}</div>
          <div className="stat-label">Total members</div>
          <div className="stat-foot">
            <span className="dot green" />
            {totals.general} general · {totals.executive} executive
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-icon">
              <Icon name="shield" />
            </span>
          </div>
          <div className="stat-value">{totals.executive}</div>
          <div className="stat-label">Executive members</div>
          <div className="stat-foot">
            <span className="dot amber" />
            {executiveShare}% of the roster
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-icon green">
              <Icon name="wallet" />
            </span>
          </div>
          <div className="stat-value">{money(totals.collected, currency)}</div>
          <div className="stat-label">Fees collected</div>
          <div className="stat-foot">
            <span className="dot green" />
            {totals.paid_count} paid memberships
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <span className="stat-icon amber">
              <Icon name="card" />
            </span>
          </div>
          <div className="stat-value">{money(totals.pending_amount, currency)}</div>
          <div className="stat-label">Pending dues</div>
          <div className="stat-foot">
            <span className="dot amber" />
            {totals.pending_count} members to follow up
          </div>
        </article>
      </div>

      <div className="layout-2">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent registrations</h2>
              <p>The newest members added to the roster</p>
            </div>
            <Link className="btn-link" to="/members">
              View all
            </Link>
          </div>
          {recent.length ? (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th>Payment</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((member) => (
                    <tr
                      className="clickable"
                      key={member.id}
                      onClick={() => navigate(`/members?member=${member.id}`)}
                    >
                      <td>
                        <div className="member-cell">
                          <span className="avatar">{initials(member.full_name)}</span>
                          <div>
                            <div className="member-name">{member.full_name}</div>
                            <div className="member-meta">
                              {member.member_code} · {member.department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <TypeBadge type={member.membership_type} />
                      </td>
                      <td>
                        <PaymentBadge status={member.payment_status} />
                      </td>
                      <td className="nowrap" style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                        {fmtDate(member.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="userPlus" />
              </div>
              <h3>No members yet</h3>
              <p>Register the first general or executive member to get the roster started.</p>
              <Link className="btn btn-primary" to="/register">
                <Icon name="plus" />
                Register a member
              </Link>
            </div>
          )}
        </section>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Pending dues</h2>
                <p>
                  {totals.pending_count
                    ? `${totals.pending_count} payment${totals.pending_count === 1 ? '' : 's'} awaiting`
                    : 'Nothing outstanding'}
                </p>
              </div>
              {totals.pending_count ? (
                <Link className="btn-link" to="/members?payment=pending">
                  All
                </Link>
              ) : null}
            </div>
            {pending.members.length ? (
              <div className="list">
                {pending.members.map((member) => (
                  <div className="list-item" key={member.id}>
                    <span className="avatar ink">{initials(member.full_name)}</span>
                    <div className="grow">
                      <div className="title">{member.full_name}</div>
                      <div className="sub">
                        {member.member_code} · {member.membership_type}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="amount">{money(member.amount, currency)}</div>
                      <button
                        className="btn-link"
                        type="button"
                        onClick={() => collectPayment(member.id)}
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 8px 18px' }}>
                <div className="empty-icon">
                  <Icon name="check" />
                </div>
                <h3>All dues collected</h3>
                <p>No pending payments right now.</p>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>By department</h2>
                <p>Where members come from</p>
              </div>
            </div>
            {departments.length ? (
              <div className="bars">
                {departments.map((row) => (
                  <div className="bar-row" key={row.department}>
                    <span className="bar-label" title={row.department}>
                      {row.department}
                    </span>
                    <span className="bar-track">
                      <span
                        className="bar-fill"
                        style={{ width: `${Math.max(5, (row.count / maxDept) * 100)}%` }}
                      />
                    </span>
                    <span className="bar-count">{row.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted small">No department data yet.</p>
            )}
          </section>
        </div>
      </div>

      {payMember && (
        <PaymentModal
          member={payMember}
          currency={currency}
          onClose={() => setPayMember(null)}
          onSaved={() => {
            setPayMember(null);
            load();
          }}
        />
      )}
    </>
  );
}
