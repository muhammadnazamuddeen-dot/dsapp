'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

let server;
let base;
let db;
let tempDir;

test.before(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-app-test-'));
  db = createDb(path.join(tempDir, 'test.db'));
  const app = createApp(db);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

async function call(pathname, { method = 'GET', body, cookie, contentType } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = contentType || 'application/json';
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, headers: response.headers };
}

async function login(username, password) {
  const response = await call('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  assert.equal(response.status, 200, `login failed for ${username}: ${JSON.stringify(response.data)}`);
  const setCookie = response.headers.get('set-cookie') || '';
  return setCookie.split(';')[0];
}

const newMember = (overrides = {}) => ({
  full_name: 'Ayesha Rahman',
  department: 'Computer Science',
  roll_number: 'CSE-2023-045',
  contact_number: '01712-345678',
  membership_type: 'general',
  payment_mode: 'offline',
  payment_status: 'paid',
  ...overrides,
});

test('authentication rejects bad credentials and opens sessions for both roles', async () => {
  const anonymous = await call('/api/auth/me');
  assert.equal(anonymous.status, 401);

  const wrong = await call('/api/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'wrong-password' },
  });
  assert.equal(wrong.status, 401);

  const adminCookie = await login('admin', 'admin123');
  const admin = await call('/api/auth/me', { cookie: adminCookie });
  assert.equal(admin.status, 200);
  assert.equal(admin.data.user.role, 'admin');

  const deskCookie = await login('desk1', 'desk123');
  const desk = await call('/api/auth/me', { cookie: deskCookie });
  assert.equal(desk.data.user.role, 'desk');
});

test('desk members can register general and executive members', async () => {
  const desk = await login('desk1', 'desk123');

  const unauthenticated = await call('/api/members', { method: 'POST', body: newMember() });
  assert.equal(unauthenticated.status, 401);

  const general = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    body: newMember({ roll_number: 'CSE-2023-045' }),
  });
  assert.equal(general.status, 201);
  assert.match(general.data.member.member_code, /^DS-\d{4}-0001$/);
  assert.match(general.data.member.receipt_no, /^RCPT-\d{4}-0001$/);
  assert.equal(general.data.member.amount, 500);
  assert.equal(general.data.member.payment_status, 'paid');
  assert.equal(general.data.member.payment_mode, 'offline');
  assert.ok(general.data.member.paid_at);
  assert.equal(general.data.member.registered_by_name, 'Desk Member');

  const executive = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    body: newMember({
      full_name: 'Tanvir Ahmed',
      roll_number: 'EEE-2022-018',
      membership_type: 'executive',
      payment_mode: 'online',
      payment_status: 'pending',
      transaction_ref: '',
    }),
  });
  assert.equal(executive.status, 201);
  assert.equal(executive.data.member.amount, 1500);
  assert.equal(executive.data.member.payment_status, 'pending');
  assert.match(executive.data.member.member_code, /^DS-\d{4}-0002$/);
  assert.match(executive.data.member.receipt_no, /^RCPT-\d{4}-0002$/);

  const duplicate = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    body: newMember({ roll_number: 'cse-2023-045' }),
  });
  assert.equal(duplicate.status, 409);

  const badPhone = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    body: newMember({ roll_number: 'CSE-2023-999', contact_number: '123' }),
  });
  assert.equal(badPhone.status, 400);

  const badPlan = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    body: newMember({ roll_number: 'CSE-2023-998', membership_type: 'life' }),
  });
  assert.equal(badPlan.status, 400);

  const list = await call('/api/members?type=executive', { cookie: desk });
  assert.equal(list.status, 200);
  assert.equal(list.data.total, 1);
  assert.equal(list.data.members[0].full_name, 'Tanvir Ahmed');

  const search = await call('/api/members?q=CSE-2023-045', { cookie: desk });
  assert.equal(search.data.total, 1);

  const plainText = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    contentType: 'text/plain',
    body: JSON.stringify(newMember({ roll_number: 'CSE-2023-997' })),
  });
  assert.equal(plainText.status, 415);
});

test('payments can be collected online and at the desk', async () => {
  const desk = await login('desk1', 'desk123');

  const pending = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    body: newMember({
      full_name: 'Nusrat Jahan',
      roll_number: 'BBA-2024-011',
      membership_type: 'executive',
      payment_mode: 'online',
      payment_status: 'pending',
    }),
  });
  const memberId = pending.data.member.id;

  const missingReference = await call(`/api/members/${memberId}/payment`, {
    method: 'POST',
    cookie: desk,
    body: { payment_mode: 'online', payment_status: 'paid' },
  });
  assert.equal(missingReference.status, 400);

  const paid = await call(`/api/members/${memberId}/payment`, {
    method: 'POST',
    cookie: desk,
    body: {
      payment_mode: 'online',
      payment_status: 'paid',
      transaction_ref: 'BKASH-8F2K19',
    },
  });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.member.payment_status, 'paid');
  assert.equal(paid.data.member.transaction_ref, 'BKASH-8F2K19');
  assert.ok(paid.data.member.paid_at);

  const stats = await call('/api/stats', { cookie: desk });
  assert.equal(stats.status, 200);
  assert.equal(stats.data.totals.total, 3);
  assert.equal(stats.data.totals.general, 1);
  assert.equal(stats.data.totals.executive, 2);
  assert.equal(stats.data.totals.collected, 2000);
  assert.equal(stats.data.totals.pending_amount, 1500);
  assert.equal(stats.data.totals.pending_count, 1);

  const demo = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    body: newMember({
      full_name: 'Rafi Chowdhury',
      roll_number: 'ARC-2021-007',
      payment_mode: 'online',
      payment_status: 'pending',
    }),
  });
  const demoId = demo.data.member.id;
  const gateway = await call(`/api/members/${demoId}/pay-online`, {
    method: 'POST',
    cookie: desk,
    body: {},
  });
  assert.equal(gateway.status, 200);
  assert.equal(gateway.data.simulated, true);
  assert.match(gateway.data.reference, /^TXN-/);
  assert.equal(gateway.data.member.payment_status, 'paid');
  assert.equal(gateway.data.member.transaction_ref, gateway.data.reference);

  const again = await call(`/api/members/${demoId}/pay-online`, {
    method: 'POST',
    cookie: desk,
    body: {},
  });
  assert.equal(again.status, 409);
});

test('desk members cannot use admin-only endpoints', async () => {
  const desk = await login('desk1', 'desk123');

  assert.equal((await call('/api/users', { cookie: desk })).status, 403);
  assert.equal((await call('/api/members/export.csv', { cookie: desk })).status, 403);
  assert.equal(
    (
      await call('/api/users', {
        method: 'POST',
        cookie: desk,
        body: { username: 'sneaky', password: 'password123', full_name: 'Sneaky User' },
      })
    ).status,
    403
  );
  assert.equal((await call('/api/members/1', { method: 'DELETE', cookie: desk, body: {} })).status, 403);
  assert.equal(
    (await call('/api/settings', { method: 'PATCH', cookie: desk, body: { general_fee: 1 } })).status,
    403
  );
});

test('admins can create, disable and re-enable desk accounts', async () => {
  const admin = await login('admin', 'admin123');

  const created = await call('/api/users', {
    method: 'POST',
    cookie: admin,
    body: {
      username: 'desk.rafi',
      full_name: 'Rafi Desk',
      password: 'rafi-pass-123',
      role: 'desk',
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.user.role, 'desk');
  assert.equal(created.data.user.active, true);

  const duplicate = await call('/api/users', {
    method: 'POST',
    cookie: admin,
    body: {
      username: 'desk.rafi',
      full_name: 'Another Rafi',
      password: 'rafi-pass-123',
      role: 'desk',
    },
  });
  assert.equal(duplicate.status, 409);

  const deskCookie = await login('desk.rafi', 'rafi-pass-123');
  const register = await call('/api/members', {
    method: 'POST',
    cookie: deskCookie,
    body: newMember({ full_name: 'Mehedi Hasan', roll_number: 'LAW-2024-020' }),
  });
  assert.equal(register.status, 201);

  const disabled = await call(`/api/users/${created.data.user.id}`, {
    method: 'PATCH',
    cookie: admin,
    body: { active: false },
  });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.data.user.active, false);

  const blocked = await call('/api/auth/login', {
    method: 'POST',
    body: { username: 'desk.rafi', password: 'rafi-pass-123' },
  });
  assert.equal(blocked.status, 401);

  await call(`/api/users/${created.data.user.id}`, {
    method: 'PATCH',
    cookie: admin,
    body: { active: true, password: 'new-pass-456' },
  });
  const relogged = await login('desk.rafi', 'new-pass-456');
  assert.ok(relogged);

  const selfDisable = await call('/api/users/1', {
    method: 'PATCH',
    cookie: admin,
    body: { active: false },
  });
  assert.equal(selfDisable.status, 400);
});

test('settings control branding and fees for new registrations', async () => {
  const admin = await login('admin', 'admin123');
  const desk = await login('desk1', 'desk123');

  const brandBefore = await call('/api/brand');
  assert.equal(brandBefore.status, 200);
  assert.equal(brandBefore.data.brand.society_name, 'The Debating Society');

  const updated = await call('/api/settings', {
    method: 'PATCH',
    cookie: admin,
    body: {
      society_name: 'Lakeside Debating & Literary Society',
      tagline: 'Speak with evidence.',
      currency: '₹',
      general_fee: 700,
      executive_fee: 2000,
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.settings.general_fee, 700);
  assert.equal(updated.data.settings.currency, '₹');

  const brandAfter = await call('/api/brand');
  assert.equal(brandAfter.data.brand.society_name, 'Lakeside Debating & Literary Society');

  const invalid = await call('/api/settings', {
    method: 'PATCH',
    cookie: admin,
    body: { general_fee: -5 },
  });
  assert.equal(invalid.status, 400);

  const member = await call('/api/members', {
    method: 'POST',
    cookie: desk,
    body: newMember({
      full_name: 'Sadia Islam',
      roll_number: 'PHY-2025-002',
      membership_type: 'executive',
      payment_mode: 'online',
      payment_status: 'paid',
      transaction_ref: 'NAGAD-77K2',
    }),
  });
  assert.equal(member.status, 201);
  assert.equal(member.data.member.amount, 2000);

  const settingsForDesk = await call('/api/settings', { cookie: desk });
  assert.equal(settingsForDesk.status, 200);
});

test('admins can export the roster as CSV', async () => {
  const admin = await login('admin', 'admin123');
  const response = await fetch(`${base}/api/members/export.csv`, {
    headers: { Cookie: admin },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/csv/);
  assert.match(response.headers.get('content-disposition') || '', /members-\d{4}-\d{2}-\d{2}\.csv/);
  const csv = await response.text();
  assert.match(csv, /Member ID,Receipt No,Full Name,Department,Roll Number/);
  assert.match(csv, /DS-\d{4}-0001/);
  assert.match(csv, /RCPT-\d{4}-0001/);
  assert.match(csv, /Ayesha Rahman/);
});

test('existing databases are upgraded with receipt serial numbers', () => {
  const { DatabaseSync } = require('node:sqlite');
  const legacyPath = path.join(tempDir, 'legacy.db');
  const legacy = new DatabaseSync(legacyPath);
  legacy.exec(`
    CREATE TABLE members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      department TEXT NOT NULL,
      roll_number TEXT NOT NULL COLLATE NOCASE,
      contact_number TEXT NOT NULL,
      membership_type TEXT NOT NULL,
      payment_mode TEXT NOT NULL,
      payment_status TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      transaction_ref TEXT,
      notes TEXT,
      registered_by INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      paid_at TEXT
    );
  `);
  const insert = legacy.prepare(
    `INSERT INTO members
       (member_code, full_name, department, roll_number, contact_number,
        membership_type, payment_mode, payment_status, amount, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insert.run('DS-2025-0001', 'Old Member', 'Arts', 'ART-1', '01700000000', 'general', 'offline', 'paid', 500, '2025-02-01T10:00:00.000Z', '2025-02-01T10:00:00.000Z');
  insert.run('DS-2026-0001', 'New Member', 'Science', 'SCI-1', '01800000000', 'executive', 'online', 'pending', 1500, '2026-01-05T10:00:00.000Z', '2026-01-05T10:00:00.000Z');
  legacy.close();

  const upgraded = createDb(legacyPath);
  const rows = upgraded.prepare('SELECT receipt_no FROM members ORDER BY id ASC').all();
  assert.deepEqual(
    rows.map((row) => row.receipt_no),
    ['RCPT-2025-0001', 'RCPT-2026-0001']
  );
  const counter = upgraded.prepare('SELECT value FROM counters WHERE key = ?').get('receipt_2026');
  assert.equal(counter.value, 1);
  upgraded.close();
});

test('changing a password invalidates existing sessions', async () => {
  const admin = await login('admin', 'admin123');

  const wrong = await call('/api/auth/password', {
    method: 'POST',
    cookie: admin,
    body: { current_password: 'nope', new_password: 'a-new-secret-1' },
  });
  assert.equal(wrong.status, 400);

  const changed = await call('/api/auth/password', {
    method: 'POST',
    cookie: admin,
    body: { current_password: 'admin123', new_password: 'a-new-secret-1' },
  });
  assert.equal(changed.status, 200);

  const stale = await call('/api/auth/me', { cookie: admin });
  assert.equal(stale.status, 401);

  const relogged = await login('admin', 'a-new-secret-1');
  const me = await call('/api/auth/me', { cookie: relogged });
  assert.equal(me.data.user.role, 'admin');
});
