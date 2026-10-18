import { pgTable, serial, text, integer, bigint, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
const isoNow = sql`to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: text('role').notNull(),
  active: integer('active').notNull().default(1),
  identity_id: text('identity_id').unique(),
  created_at: text('created_at').notNull().default(isoNow),
}, t => [check('users_role', sql`${t.role} in ('admin', 'desk')`)]);
export const sessions = pgTable('sessions', {
  token_hash: text('token_hash').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires_at: bigint('expires_at', { mode: 'number' }).notNull(),
});
export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  member_code: text('member_code').notNull().unique(),
  receipt_no: text('receipt_no').unique(),
  full_name: text('full_name').notNull(),
  department: text('department').notNull(),
  roll_number: text('roll_number').notNull(),
  contact_number: text('contact_number').notNull(),
  membership_type: text('membership_type').notNull(),
  payment_mode: text('payment_mode').notNull(),
  payment_status: text('payment_status').notNull(),
  amount: integer('amount').notNull().default(0),
  transaction_ref: text('transaction_ref'),
  notes: text('notes'),
  registered_by: integer('registered_by').references(() => users.id, { onDelete: 'set null' }),
  created_at: text('created_at').notNull().default(isoNow),
  updated_at: text('updated_at').notNull().default(isoNow),
  paid_at: text('paid_at'),
}, t => [uniqueIndex('idx_members_roll').on(sql`lower(${t.roll_number})`), index('idx_members_created').on(t.created_at), index('idx_members_type').on(t.membership_type), index('idx_members_payment').on(t.payment_status), check('members_type',sql`${t.membership_type} in ('general','executive')`), check('members_mode',sql`${t.payment_mode} in ('online','offline')`), check('members_status',sql`${t.payment_status} in ('paid','pending')`), check('members_amount', sql`${t.amount} >= 0`)]);
export const settings = pgTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
export const counters = pgTable('counters', { key: text('key').primaryKey(), value: integer('value').notNull() });

export const loginAttempts = pgTable('login_attempts', { key: text('key').primaryKey(), count: integer('count').notNull(), reset_at: bigint('reset_at', { mode: 'number' }).notNull() });
