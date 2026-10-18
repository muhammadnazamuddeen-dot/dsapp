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

export function societySeal(name = 'Debating Society') {
  const words = String(name)
    .split(/\s+/)
    .filter((word) => !['the', 'of', 'and', '&'].includes(word.toLowerCase()));
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'DS';
}
