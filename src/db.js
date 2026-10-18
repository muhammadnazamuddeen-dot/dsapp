'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./auth');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'desk')),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  member_code     TEXT NOT NULL UNIQUE,
  receipt_no      TEXT,
  full_name       TEXT NOT NULL,
  department      TEXT NOT NULL,
  roll_number     TEXT NOT NULL COLLATE NOCASE,
  contact_number  TEXT NOT NULL,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('general', 'executive')),
  payment_mode    TEXT NOT NULL CHECK (payment_mode IN ('online', 'offline')),
  payment_status  TEXT NOT NULL CHECK (payment_status IN ('paid', 'pending')),
  amount          INTEGER NOT NULL DEFAULT 0,
  transaction_ref TEXT,
  notes           TEXT,
  registered_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  paid_at         TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_roll ON members (roll_number COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_members_created ON members (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_type ON members (membership_type);
CREATE INDEX IF NOT EXISTS idx_members_payment ON members (payment_status);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
`;

const DEFAULT_SETTINGS = {
  society_name: 'The Debating Society',
  tagline: 'Argue well. Think better.',
  currency: '৳',
  general_fee: '500',
  executive_fee: '1500',
};

function createDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  migrate(db);
  seed(db);
  return db;
}

// Existing databases created before receipts were serialised get a receipt number
// for every member, keeping one sequence per year.
function migrate(db) {
  const columns = db.prepare('PRAGMA table_info(members)').all().map((column) => column.name);

  if (!columns.includes('receipt_no')) {
    db.exec('ALTER TABLE members ADD COLUMN receipt_no TEXT');
    const rows = db.prepare('SELECT id, created_at FROM members ORDER BY id ASC').all();
    const update = db.prepare('UPDATE members SET receipt_no = ? WHERE id = ?');
    const perYear = new Map();

    for (const row of rows) {
      const year = /^\d{4}/.test(String(row.created_at))
        ? String(row.created_at).slice(0, 4)
        : String(new Date().getFullYear());
      const next = (perYear.get(year) || 0) + 1;
      perYear.set(year, next);
      update.run(`RCPT-${year}-${String(next).padStart(4, '0')}`, row.id);
    }

    const upsert = db.prepare(
      'INSERT INTO counters (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = MAX(value, excluded.value)'
    );
    for (const [year, value] of perYear) upsert.run(`receipt_${year}`, value);
  }

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_members_receipt ON members (receipt_no)');
}

function seed(db) {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (Number(existing) === 0) {
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const deskUser = process.env.DESK_USERNAME || 'desk1';
    const deskPass = process.env.DESK_PASSWORD || 'desk123';
    const insert = db.prepare(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    );
    insert.run(adminUser, hashPassword(adminPass), 'Society Admin', 'admin');
    insert.run(deskUser, hashPassword(deskPass), 'Desk Member', 'desk');
    console.log(`[seed] First run: created admin "${adminUser}" and desk user "${deskUser}".`);
    console.log('[seed] Change these passwords from Settings after signing in.');
  }

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(key, value);
}

function getSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const raw = {};
  for (const row of rows) raw[row.key] = row.value;
  return {
    society_name: raw.society_name || DEFAULT_SETTINGS.society_name,
    tagline: raw.tagline || DEFAULT_SETTINGS.tagline,
    currency: raw.currency || DEFAULT_SETTINGS.currency,
    general_fee: Number(raw.general_fee ?? DEFAULT_SETTINGS.general_fee),
    executive_fee: Number(raw.executive_fee ?? DEFAULT_SETTINGS.executive_fee),
  };
}

const EDITABLE_SETTINGS = new Set(['society_name', 'tagline', 'currency', 'general_fee', 'executive_fee']);

function updateSettings(db, patch) {
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  for (const [key, value] of Object.entries(patch)) {
    if (!EDITABLE_SETTINGS.has(key)) continue;
    upsert.run(key, String(value));
  }
  return getSettings(db);
}

function nextMemberCode(db, year = new Date().getFullYear()) {
  const key = `member_${year}`;
  db.prepare(
    'INSERT INTO counters (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = value + 1'
  ).run(key);
  const row = db.prepare('SELECT value FROM counters WHERE key = ?').get(key);
  return `DS-${year}-${String(row.value).padStart(4, '0')}`;
}

function nextReceiptNo(db, year = new Date().getFullYear()) {
  const key = `receipt_${year}`;
  db.prepare(
    'INSERT INTO counters (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = value + 1'
  ).run(key);
  const row = db.prepare('SELECT value FROM counters WHERE key = ?').get(key);
  return `RCPT-${year}-${String(row.value).padStart(4, '0')}`;
}

module.exports = {
  createDb,
  getSettings,
  updateSettings,
  nextMemberCode,
  nextReceiptNo,
  DEFAULT_SETTINGS,
};
