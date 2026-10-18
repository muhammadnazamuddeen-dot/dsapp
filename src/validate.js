'use strict';

const MEMBERSHIP_TYPES = new Set(['general', 'executive']);
const PAYMENT_MODES = new Set(['online', 'offline']);
const PAYMENT_STATUSES = new Set(['paid', 'pending']);

function str(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeName(value) {
  const name = str(value, 80);
  if (name.length < 2) return { error: 'Full name must be at least 2 characters.' };
  if (!/^[\p{L}][\p{L}\p{M}\s.'’\-]*$/u.test(name)) {
    return { error: 'Full name contains unsupported characters.' };
  }
  return { value: name };
}

function normalizeDepartment(value) {
  const dept = str(value, 80);
  if (dept.length < 2) return { error: 'Department must be at least 2 characters.' };
  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s&()/.,'’\-]*$/u.test(dept)) {
    return { error: 'Department contains unsupported characters.' };
  }
  return { value: dept };
}

function normalizeRoll(value) {
  const roll = str(value, 30).toUpperCase();
  if (!roll) return { error: 'Roll number is required.' };
  if (!/^[A-Z0-9][A-Z0-9/\-_. ]{0,29}$/.test(roll)) {
    return { error: 'Roll number may only use letters, numbers, /, -, _ and spaces.' };
  }
  return { value: roll };
}

function normalizeContact(value) {
  const compact = str(value, 30).replace(/[\s\-().]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(compact)) {
    return { error: 'Contact number must be 7–15 digits (a leading + is allowed).' };
  }
  return { value: compact };
}

function normalizeReference(value) {
  const ref = str(value, 60);
  if (!ref) return { value: '' };
  if (!/^[A-Za-z0-9][A-Za-z0-9\-_/.#]*$/.test(ref)) {
    return { error: 'Transaction reference may only use letters, numbers, -, _, /, . and #.' };
  }
  return { value: ref };
}

function normalizeNotes(value) {
  return str(value, 300);
}

function normalizeUsername(value) {
  const username = str(value, 30).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
    return {
      error: 'Username must be 3–30 characters: letters, numbers, dots, dashes or underscores.',
    };
  }
  return { value: username };
}

function validatePassword(value) {
  const password = typeof value === 'string' ? value : '';
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (password.length > 128) return { error: 'Password is too long.' };
  return { value: password };
}

function normalizeFee(value, label) {
  const fee = Number(value);
  if (!Number.isFinite(fee) || !Number.isInteger(fee) || fee < 0 || fee > 10000000) {
    return { error: `${label} must be a whole number between 0 and 10,000,000.` };
  }
  return { value: fee };
}

module.exports = {
  MEMBERSHIP_TYPES,
  PAYMENT_MODES,
  PAYMENT_STATUSES,
  str,
  normalizeName,
  normalizeDepartment,
  normalizeRoll,
  normalizeContact,
  normalizeReference,
  normalizeNotes,
  normalizeUsername,
  validatePassword,
  normalizeFee,
};
