import { api } from '../api.js';
import {
  esc,
  icon,
  initials,
  fmtDate,
  greeting,
  money,
  paymentBadge,
  todayLabel,
  typeBadge,
  toast,
} from '../ui.js';
import { openPaymentModal } from './members.js';

export async function dashboardView(root, ctx) {
  const [{ totals, recent, departments }, pending] = await Promise.all([
    api.stats(),
    api.listMembers({ payment: 'pending', limit: 5 }),
  ]);

  const currency = ctx.settings.currency;
  const firstName = String(ctx.user.full_name || 'there').split(/\s+/)[0];
  const executiveShare = totals.total ? Math.round((totals.executive / totals.total) * 100) : 0;
  const maxDept = departments.reduce((max, row) => Math.max(max, row.count), 0) || 1;

  const recentRows = recent
    .map(
      (member) => `
      <tr class="clickable" data-open-member="${member.id}">
        <td>
          <div class="member-cell">
            <span class="avatar">${esc(initials(member.full_name))}</span>
            <div>
              <div class="member-name">${esc(member.full_name)}</div>
              <div class="member-meta">${esc(member.member_code)} · ${esc(member.department)}</div>
            </div>
          </div>
        </td>
        <td>${typeBadge(member.membership_type)}</td>
        <td>${paymentBadge(member.payment_status)}</td>
        <td class="nowrap" style="color:var(--muted);font-size:12.5px">${esc(fmtDate(member.created_at))}</td>
      </tr>`
    )
    .join('');

  const pendingItems = pending.members
    .map(
      (member) => `
      <div class="list-item">
        <span class="avatar ink">${esc(initials(member.full_name))}</span>
        <div class="grow">
          <div class="title">${esc(member.full_name)}</div>
          <div class="sub">${esc(member.member_code)} · ${esc(member.membership_type)}</div>
        </div>
        <div style="text-align:right">
          <div class="amount">${esc(money(member.amount, currency))}</div>
          <button class="btn-link" type="button" data-collect="${member.id}">Collect</button>
        </div>
      </div>`
    )
    .join('');

  const departmentBars = departments
    .map(
      (row) => `
      <div class="bar-row">
        <span class="bar-label" title="${esc(row.department)}">${esc(row.department)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${Math.max(5, (row.count / maxDept) * 100)}%"></span></span>
        <span class="bar-count">${row.count}</span>
      </div>`
    )
    .join('');

  root.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow">Overview · ${esc(todayLabel())}</p>
        <h1>${esc(greeting())}, ${esc(firstName)}</h1>
        <p class="muted">Here is how membership at ${esc(ctx.brand.society_name)} is going.</p>
      </div>
      <div class="page-head-actions">
        <a class="btn btn-ghost" href="#/members?payment=pending">Review pending</a>
        <a class="btn btn-primary" href="#/register">${icon('plus')}Register member</a>
      </div>
    </div>

    <div class="stat-grid">
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon ink">${icon('users')}</span></div>
        <div class="stat-value">${totals.total}</div>
        <div class="stat-label">Total members</div>
        <div class="stat-foot"><span class="dot green"></span>${totals.general} general · ${totals.executive} executive</div>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon">${icon('shield')}</span></div>
        <div class="stat-value">${totals.executive}</div>
        <div class="stat-label">Executive members</div>
        <div class="stat-foot"><span class="dot amber"></span>${executiveShare}% of the roster</div>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon green">${icon('wallet')}</span></div>
        <div class="stat-value">${esc(money(totals.collected, currency))}</div>
        <div class="stat-label">Fees collected</div>
        <div class="stat-foot"><span class="dot green"></span>${totals.paid_count} paid memberships</div>
      </article>
      <article class="stat-card">
        <div class="stat-top"><span class="stat-icon amber">${icon('card')}</span></div>
        <div class="stat-value">${esc(money(totals.pending_amount, currency))}</div>
        <div class="stat-label">Pending dues</div>
        <div class="stat-foot"><span class="dot amber"></span>${totals.pending_count} members to follow up</div>
      </article>
    </div>

    <div class="layout-2">
      <section class="panel">
        <div class="panel-head">
          <div><h2>Recent registrations</h2><p>The newest members added to the roster</p></div>
          <a class="btn-link" href="#/members">View all</a>
        </div>
        ${
          recent.length
            ? `<div class="table-wrap">
                 <table class="data">
                   <thead><tr><th>Member</th><th>Plan</th><th>Payment</th><th>Registered</th></tr></thead>
                   <tbody>${recentRows}</tbody>
                 </table>
               </div>`
            : `<div class="empty-state">
                 <div class="empty-icon">${icon('userPlus')}</div>
                 <h3>No members yet</h3>
                 <p>Register the first general or executive member to get the roster started.</p>
                 <a class="btn btn-primary" href="#/register">${icon('plus')}Register a member</a>
               </div>`
        }
      </section>

      <div class="stack">
        <section class="panel">
          <div class="panel-head">
            <div><h2>Pending dues</h2><p>${totals.pending_count ? `${totals.pending_count} payment${totals.pending_count === 1 ? '' : 's'} awaiting` : 'Nothing outstanding'}</p></div>
            ${totals.pending_count ? '<a class="btn-link" href="#/members?payment=pending">All</a>' : ''}
          </div>
          ${
            pending.members.length
              ? `<div class="list">${pendingItems}</div>`
              : `<div class="empty-state" style="padding:24px 8px 18px">
                   <div class="empty-icon">${icon('check')}</div>
                   <h3>All dues collected</h3>
                   <p>No pending payments right now.</p>
                 </div>`
          }
        </section>

        <section class="panel">
          <div class="panel-head"><div><h2>By department</h2><p>Where members come from</p></div></div>
          ${
            departments.length
              ? `<div class="bars">${departmentBars}</div>`
              : '<p class="muted small">No department data yet.</p>'
          }
        </section>
      </div>
    </div>`;

  root.querySelectorAll('[data-open-member]').forEach((row) => {
    row.addEventListener('click', () => {
      location.hash = `#/members?member=${row.dataset.openMember}`;
    });
  });

  root.querySelectorAll('[data-collect]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const { member } = await api.getMember(button.dataset.collect);
        openPaymentModal(member, ctx, () => ctx.reload());
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}
