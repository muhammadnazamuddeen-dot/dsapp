/* Shared UI helpers. Everything user-supplied must pass through esc(). */

const ICONS = {
  dashboard:
    '<rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/>',
  userPlus:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  users:
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  print:
    '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  trash:
    '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  receipt:
    '<path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m11 12 9-9M17 6l3 3M14 9l3 3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  wallet:
    '<path d="M20 7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16V7H5a2 2 0 0 0-2 2"/><path d="M18 13h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
};

export function icon(name, className = '') {
  const paths = ICONS[name] || ICONS.info;
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

const numberFmt = new Intl.NumberFormat('en-US');
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function money(amount, currency = '৳') {
  const value = Number(amount);
  return `${currency}${numberFmt.format(Number.isFinite(value) ? value : 0)}`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateFmt.format(date);
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFmt.format(date);
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function titleCase(value = '') {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

export function typeBadge(type) {
  const label = type === 'executive' ? 'Executive' : 'General';
  return `<span class="badge badge-${esc(type)}"><span class="dot"></span>${label}</span>`;
}

export function paymentBadge(status) {
  const paid = status === 'paid';
  return `<span class="badge badge-${paid ? 'paid' : 'pending'}"><span class="dot"></span>${paid ? 'Paid' : 'Pending'}</span>`;
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function todayLabel() {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}

/* ------------------------------- toasts ------------------------------- */

export function toast(message, type = 'success') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  const iconName = type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check';
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icon(iconName)}<span>${esc(message)}</span>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 4200);
}

/* ------------------------------- modals ------------------------------- */

const modalStack = [];

export function openModal(innerHtml, { className = '', onClose } = {}) {
  const host = document.getElementById('modal-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal ${className}" role="dialog" aria-modal="true">${innerHtml}</div>`;
  host.appendChild(backdrop);
  document.body.classList.add('modal-open');

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    setTimeout(() => backdrop.remove(), 180);
    const index = modalStack.indexOf(entry);
    if (index !== -1) modalStack.splice(index, 1);
    if (typeof onClose === 'function') onClose();
  };

  const entry = { close };
  modalStack.push(entry);

  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close();
  });
  backdrop.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', close);
  });

  requestAnimationFrame(() => backdrop.classList.add('is-open'));
  setTimeout(() => {
    const target =
      backdrop.querySelector('[autofocus]') ||
      backdrop.querySelector('input:not([type="hidden"]), select, textarea, button');
    if (target) target.focus();
  }, 40);

  return { root: backdrop, close };
}

export function closeModal() {
  const top = modalStack[modalStack.length - 1];
  if (top) top.close();
}

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const top = modalStack[modalStack.length - 1];
  if (top) {
    event.preventDefault();
    top.close();
  }
});

export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const { root, close } = openModal(
      `<div class="modal-head">
         <div><p class="eyebrow">Please confirm</p><h3>${esc(title)}</h3></div>
         <button type="button" class="modal-close" data-close aria-label="Close">${icon('close')}</button>
       </div>
       <p class="muted" style="font-size:13.5px;line-height:1.6">${esc(message)}</p>
       <div class="modal-actions">
         <button type="button" class="btn btn-ghost" data-cancel>${esc(cancelLabel)}</button>
         <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${esc(confirmLabel)}</button>
       </div>`,
      { onClose: () => finish(false) }
    );

    root.querySelector('[data-cancel]').addEventListener('click', () => close());
    root.querySelector('[data-confirm]').addEventListener('click', () => {
      finish(true);
      close();
    });
  });
}
