'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const { tsImport } = require('tsx/esm/api');
const { createApp } = require('../src/app');
const serverless = require('serverless-http');

test('Netlify API preserves registration, receipts, search, sessions and role restrictions on Postgres', async () => {
  // A disposable Postgres engine exercises migration SQL without connecting to a site database.
  const pg = new PGlite();
  const root = path.join(__dirname, '../netlify/database/migrations');
  for (const directory of fs.readdirSync(root).sort()) {
    const file = path.join(root, directory, 'migration.sql');
    if (fs.existsSync(file)) await pg.exec(fs.readFileSync(file, 'utf8'));
  }
  const module = await tsImport('../db/index.ts', __filename);
  const db = module.createDatabase({
    async query(config, params) {
      const result = await pg.query(typeof config === 'string' ? config : config.text, params || []);
      return { rows: result.rows, rowCount: result.affectedRows };
    },
    release() {},
  });
  const admin = { id: 1, username: 'owner@example.test', full_name: 'Owner', role: 'admin' };
  await db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run(admin.username, 'identity', admin.full_name, admin.role);
  const handler = serverless(createApp(db, { identityUser: admin }));
  async function call(method, url, body, target = handler) {
    const parsed = new URL(url, 'https://example.test');
    const result = await target({ httpMethod: method, path: parsed.pathname, headers: { 'content-type': 'application/json' }, queryStringParameters: Object.fromEntries(parsed.searchParams), body: body === undefined ? null : JSON.stringify(body), isBase64Encoded: false }, {});
    return { status: result.statusCode, body: JSON.parse(result.body) };
  }
  try {
    assert.equal((await call('GET', '/api/auth/me')).body.user.role, 'admin');
    const first = await call('POST', '/api/members', { full_name: 'Ada Example', department: 'Science', roll_number: 'SCI-001', contact_number: '01712345678', membership_type: 'general', payment_mode: 'offline', payment_status: 'paid' });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.match(first.body.member.receipt_no, /^RCPT-\d{4}-0001$/);
    assert.equal(first.body.member.amount, 500);
    const duplicate = await call('POST', '/api/members', { ...first.body.member, roll_number: 'sci-001' });
    assert.equal(duplicate.status, 409);
    const second = await call('POST', '/api/members', { ...first.body.member, full_name: 'Second Member', roll_number: 'SCI-002', payment_status: 'pending' });
    assert.equal(second.status, 201, JSON.stringify(second.body));
    assert.match(second.body.member.receipt_no, /^RCPT-\d{4}-0002$/);
    assert.equal((await call('GET', '/api/members?q=ada')).body.total, 1);
    assert.equal((await call('PATCH', '/api/settings', { general_fee: 700 })).body.settings.general_fee, 700);
    const stats = await call('GET', '/api/stats');
    assert.equal(Number(stats.body.totals.total), 2);
    const desk = serverless(createApp(db, { identityUser: { ...admin, role: 'desk' } }));
    assert.equal((await call('DELETE', '/api/members/1', undefined, desk)).status, 403);
    const guest = serverless(createApp(db));
    assert.equal((await call('GET', '/api/auth/me', undefined, guest)).status, 401);
    assert.equal((await call('GET', '/api/brand', undefined, guest)).status, 200);
    await db.prepare('INSERT INTO login_attempts (key, count, reset_at) VALUES (?, ?, ?)').run('test', 1, Date.now());
    assert.equal(Number((await db.prepare('SELECT count FROM login_attempts WHERE key = ?').get('test')).count), 1);
  } finally {
    await db.close();
    await pg.close();
  }
});
