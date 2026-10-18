import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/UIContext';
import { Icon } from '../components/Icon';
import { PaymentBadge, TypeBadge } from '../components/Badges';
import { ErrorPanel, PageLoading } from '../components/States';
import { MemberDetailModal } from '../components/MemberDetailModal';
import { MemberEditModal } from '../components/MemberEditModal';
import { PaymentModal } from '../components/PaymentModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { fmtDate, initials, money, titleCase } from '../lib/format';

export function MembersPage() {
  const { user, settings } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMemberRef = useRef(searchParams.get('member'));
  const requestId = useRef(0);

  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [query, setQuery] = useState(search);
  const [type, setType] = useState(() => searchParams.get('type') || '');
  const [payment, setPayment] = useState(() => searchParams.get('payment') || '');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const [activeMember, setActiveMember] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [payMember, setPayMember] = useState(null);
  const [receiptMember, setReceiptMember] = useState(null);

  const isAdmin = user.role === 'admin';
  const currency = settings.currency;

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const data = await api.listMembers({
        q: query,
        type,
        payment,
        page,
        limit: 10,
      });
      if (id !== requestId.current) return;
      setResult(data);
      if (data.page !== page) setPage(data.page);
    } catch (requestError) {
      if (id !== requestId.current) return;
      setError(requestError.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query, type, payment, page, refreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = Number(initialMemberRef.current);
    if (Number.isInteger(id) && id > 0) openMember(id);
    // Only open the deep-linked member once when the page mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openMember(id) {
    try {
      const response = await api.getMember(id);
      setActiveMember(response.member);
    } catch (requestError) {
      toast(requestError.message, 'error');
    }
  }

  function clearMemberParam() {
    if (!searchParams.has('member')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('member');
    setSearchParams(next, { replace: true });
  }

  function closeDetail() {
    setActiveMember(null);
    clearMemberParam();
  }

  function refresh() {
    setRefreshToken((value) => value + 1);
  }

  function resetFilters() {
    setSearch('');
    setType('');
    setPayment('');
    setPage(1);
  }

  function handleExport() {
    const params = new URLSearchParams();
    const currentSearch = search.trim();
    if (currentSearch) params.set('q', currentSearch);
    if (type) params.set('type', type);
    if (payment) params.set('payment', payment);
    window.location.href = `/api/members/export.csv?${params.toString()}`;
  }

  function renderTable(data) {
    if (data.total === 0) {
      const filtered = Boolean(query || type || payment);
      return (
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name={filtered ? 'search' : 'users'} />
          </div>
          <h3>{filtered ? 'No matching members' : 'No members yet'}</h3>
          <p>
            {filtered
              ? 'Try a different search or clear the filters to see the full roster.'
              : 'Register the first member to start building the society roster.'}
          </p>
          {filtered ? (
            <button className="btn btn-ghost" type="button" onClick={resetFilters}>
              Clear filters
            </button>
          ) : (
            <Link className="btn btn-primary" to="/register">
              Register a member
            </Link>
          )}
        </div>
      );
    }

    const start = (data.page - 1) * data.limit + 1;
    const end = Math.min(data.total, data.page * data.limit);

    return (
      <>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Member</th>
                <th>Roll no.</th>
                <th>Contact</th>
                <th>Plan</th>
                <th>Payment</th>
                <th>Registered</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr className="clickable" key={member.id} onClick={() => openMember(member.id)}>
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
                  <td className="mono" style={{ fontSize: 12.5 }}>
                    {member.roll_number}
                  </td>
                  <td className="nowrap" style={{ fontSize: 12.5 }}>
                    {member.contact_number}
                  </td>
                  <td>
                    <TypeBadge type={member.membership_type} />
                  </td>
                  <td>
                    <PaymentBadge status={member.payment_status} />
                    <div className="member-meta">
                      {money(member.amount, currency)} · {titleCase(member.payment_mode)}
                    </div>
                  </td>
                  <td className="nowrap" style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    {fmtDate(member.created_at)}
                  </td>
                  <td className="td-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openMember(member.id);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>
            Showing {start}–{end} of {data.total} member{data.total === 1 ? '' : 's'}
          </span>
          <div className="page-btns">
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
            >
              <Icon name="chevronLeft" />
              Prev
            </button>
            <span className="pill-note">
              Page {data.page} of {data.pages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={data.page >= data.pages}
              onClick={() => setPage(data.page + 1)}
            >
              Next
              <Icon name="chevronRight" />
            </button>
          </div>
        </div>
      </>
    );
  }

  let results;
  if (loading && !result) {
    results = <PageLoading label="Loading members…" />;
  } else if (error) {
    results = <ErrorPanel title="Could not load members" message={error} onRetry={load} />;
  } else if (result) {
    results = renderTable(result);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Roster</p>
          <h1>Members</h1>
          <p className="muted">
            Every general and executive member, with payment status and desk records.
          </p>
        </div>
        <div className="page-head-actions">
          <Link className="btn btn-primary" to="/register">
            <Icon name="plus" />
            Register member
          </Link>
        </div>
      </div>

      <section className="panel" aria-busy={loading}>
        <div className="table-toolbar">
          <div className="search">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Search name, roll, phone or member ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  setQuery(search.trim());
                  setPage(1);
                }
              }}
              aria-label="Search members"
            />
          </div>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by membership plan"
          >
            <option value="">All plans</option>
            <option value="general">General</option>
            <option value="executive">Executive</option>
          </select>
          <select
            value={payment}
            onChange={(event) => {
              setPayment(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by payment status"
          >
            <option value="">All payments</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
          <span className="spacer" />
          {isAdmin && (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={handleExport}
              title="Admin only — downloads the filtered roster as a spreadsheet"
            >
              <Icon name="download" />
              Export CSV
            </button>
          )}
        </div>
        <div>{results}</div>
      </section>

      {activeMember && (
        <MemberDetailModal
          member={activeMember}
          currency={currency}
          isAdmin={isAdmin}
          onClose={closeDetail}
          onEdit={() => {
            const member = activeMember;
            closeDetail();
            setEditMember(member);
          }}
          onPayment={() => {
            const member = activeMember;
            closeDetail();
            setPayMember(member);
          }}
          onReceipt={() => {
            const member = activeMember;
            closeDetail();
            setReceiptMember(member);
          }}
          onDeleted={() => {
            closeDetail();
            refresh();
          }}
          onPaid={() => {
            closeDetail();
            refresh();
          }}
        />
      )}

      {editMember && (
        <MemberEditModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => {
            setEditMember(null);
            refresh();
          }}
        />
      )}

      {payMember && (
        <PaymentModal
          member={payMember}
          currency={currency}
          onClose={() => setPayMember(null)}
          onSaved={() => {
            setPayMember(null);
            refresh();
          }}
        />
      )}

      {receiptMember && (
        <ReceiptModal
          member={receiptMember}
          settings={settings}
          onClose={() => setReceiptMember(null)}
        />
      )}
    </>
  );
}
