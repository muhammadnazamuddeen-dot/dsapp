'use strict';
const express = require('express');
const { authRequired, adminRequired } = require('../auth');
const { getSettings, nextMemberCode, nextReceiptNo } = require('../db-settings');
const { MEMBERSHIP_TYPES, PAYMENT_MODES, PAYMENT_STATUSES, str, normalizeName, normalizeDepartment, normalizeRoll, normalizeContact, normalizeReference, normalizeNotes, } = require('../validate');
const MEMBER_SELECT = `
  SELECT m.*, u.full_name AS registered_by_name
    FROM members m
    LEFT JOIN users u ON u.id = m.registered_by
`;
async function findMember(db, id) {
    return await db.prepare(`${MEMBER_SELECT} WHERE m.id = ?`).get(id);
}
function buildFilter(query) {
    const where = [];
    const params = [];
    const q = str(query.q, 80);
    if (q) {
        const like = `%${q.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
        where.push(`(
      m.full_name LIKE ? ESCAPE '\\' OR
      m.roll_number LIKE ? ESCAPE '\\' OR
      m.contact_number LIKE ? ESCAPE '\\' OR
      m.member_code LIKE ? ESCAPE '\\' OR
      m.department LIKE ? ESCAPE '\\'
    )`);
        params.push(like, like, like, like, like);
    }
    const type = str(query.type, 20);
    if (MEMBERSHIP_TYPES.has(type)) {
        where.push('m.membership_type = ?');
        params.push(type);
    }
    const payment = str(query.payment, 20);
    if (PAYMENT_STATUSES.has(payment)) {
        where.push('m.payment_status = ?');
        params.push(payment);
    }
    const department = str(query.department, 80);
    if (department) {
        where.push('m.department = ?');
        params.push(department);
    }
    return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}
function parseMemberInput(body) {
    const name = normalizeName(body?.full_name);
    if (name.error)
        return name;
    const department = normalizeDepartment(body?.department);
    if (department.error)
        return department;
    const roll = normalizeRoll(body?.roll_number);
    if (roll.error)
        return roll;
    const contact = normalizeContact(body?.contact_number);
    if (contact.error)
        return contact;
    const membershipType = str(body?.membership_type, 20).toLowerCase();
    if (!MEMBERSHIP_TYPES.has(membershipType)) {
        return { error: 'Choose a membership type: general or executive.' };
    }
    const paymentMode = str(body?.payment_mode, 20).toLowerCase();
    if (!PAYMENT_MODES.has(paymentMode)) {
        return { error: 'Choose a payment mode: online or offline.' };
    }
    const paymentStatus = str(body?.payment_status, 20).toLowerCase();
    if (paymentStatus && !PAYMENT_STATUSES.has(paymentStatus)) {
        return { error: 'Payment status must be paid or pending.' };
    }
    const reference = normalizeReference(body?.transaction_ref);
    if (reference.error)
        return reference;
    return {
        value: {
            full_name: name.value,
            department: department.value,
            roll_number: roll.value,
            contact_number: contact.value,
            membership_type: membershipType,
            payment_mode: paymentMode,
            payment_status: paymentStatus || (paymentMode === 'offline' ? 'paid' : 'pending'),
            transaction_ref: reference.value,
            notes: normalizeNotes(body?.notes),
        },
    };
}
function generateReference() {
    const stamp = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TXN-${stamp}${rand}`;
}
module.exports = function memberRoutes(db) {
    const router = express.Router();
    router.use(authRequired(db));
    router.get('/stats', async (req, res) => {
        const totals = await db
            .prepare(`SELECT
           COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN membership_type = 'general' THEN 1 ELSE 0 END), 0) AS general,
           COALESCE(SUM(CASE WHEN membership_type = 'executive' THEN 1 ELSE 0 END), 0) AS executive,
           COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) AS collected,
           COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount,
           COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
           COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_count
         FROM members`)
            .get();
        const recent = await db
            .prepare(`${MEMBER_SELECT} ORDER BY m.id DESC LIMIT 6`)
            .all();
        const departments = await db
            .prepare(`SELECT department, COUNT(*) AS count
           FROM members
          GROUP BY department
          ORDER BY count DESC, department ASC
          LIMIT 6`)
            .all();
        res.json({ totals, recent, departments });
    });
    router.get('/members/export.csv', adminRequired, async (req, res) => {
        const { whereSql, params } = buildFilter(req.query);
        const rows = await db.prepare(`${MEMBER_SELECT} ${whereSql} ORDER BY m.id ASC`).all(...params);
        const header = [
            'Member ID',
            'Receipt No',
            'Full Name',
            'Department',
            'Roll Number',
            'Contact Number',
            'Membership Type',
            'Payment Mode',
            'Payment Status',
            'Amount',
            'Transaction Reference',
            'Registered By',
            'Registered On',
            'Paid On',
        ];
        const cell = (value) => {
            const text = value === null || value === undefined ? '' : String(value);
            return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        };
        const lines = [header.map(cell).join(',')];
        for (const row of rows) {
            lines.push([
                row.member_code,
                row.receipt_no || '',
                row.full_name,
                row.department,
                row.roll_number,
                row.contact_number,
                row.membership_type,
                row.payment_mode,
                row.payment_status,
                row.amount,
                row.transaction_ref || '',
                row.registered_by_name || '',
                row.created_at,
                row.paid_at || '',
            ]
                .map(cell)
                .join(','));
        }
        const date = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="members-${date}.csv"`);
        res.send(`\uFEFF${lines.join('\r\n')}\r\n`);
    });
    router.get('/members', async (req, res) => {
        const { whereSql, params } = buildFilter(req.query);
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
        const total = Number((await db.prepare(`SELECT COUNT(*) AS c FROM members m ${whereSql}`).get(...params)).c);
        const pages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, pages);
        const rows = await db
            .prepare(`${MEMBER_SELECT} ${whereSql} ORDER BY m.id DESC LIMIT ? OFFSET ?`)
            .all(...params, limit, (safePage - 1) * limit);
        res.json({ members: rows, total, page: safePage, pages, limit });
    });
    router.get('/members/:id', async (req, res) => {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1)
            return res.status(400).json({ error: 'Invalid member id.' });
        const member = await findMember(db, id);
        if (!member)
            return res.status(404).json({ error: 'Member not found.' });
        res.json({ member });
    });
    router.post('/members', async (req, res) => {
        const parsed = parseMemberInput(req.body);
        if (parsed.error)
            return res.status(400).json({ error: parsed.error });
        const member = parsed.value;
        const duplicate = await db.prepare('SELECT id FROM members WHERE roll_number = ?').get(member.roll_number);
        if (duplicate) {
            return res.status(409).json({ error: 'A member with this roll number is already registered.' });
        }
        const settings = await getSettings(db);
        const amount = member.membership_type === 'executive' ? settings.executive_fee : settings.general_fee;
        let reference = member.transaction_ref || null;
        if (member.payment_status === 'paid' && member.payment_mode === 'online' && !reference) {
            reference = generateReference();
        }
        const paidAt = member.payment_status === 'paid' ? new Date().toISOString() : null;
        await db.exec('BEGIN IMMEDIATE');
        try {
            const year = new Date().getFullYear();
            const code = await nextMemberCode(db, year);
            const receiptNo = await nextReceiptNo(db, year);
            const result = await db
                .prepare(`INSERT INTO members
             (member_code, receipt_no, full_name, department, roll_number, contact_number,
              membership_type, payment_mode, payment_status, amount, transaction_ref,
              notes, registered_by, paid_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(code, receiptNo, member.full_name, member.department, member.roll_number, member.contact_number, member.membership_type, member.payment_mode, member.payment_status, amount, reference, member.notes || null, req.user.id, paidAt);
            await db.exec('COMMIT');
            res.status(201).json({ member: await findMember(db, Number(result.lastInsertRowid)) });
        }
        catch (error) {
            await db.exec('ROLLBACK');
            if ((error.code === '23505' || String(error.message).includes('UNIQUE'))) {
                return res.status(409).json({ error: 'A member with this roll number is already registered.' });
            }
            throw error;
        }
    });
    router.patch('/members/:id', async (req, res) => {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1)
            return res.status(400).json({ error: 'Invalid member id.' });
        const existing = await findMember(db, id);
        if (!existing)
            return res.status(404).json({ error: 'Member not found.' });
        const updates = {};
        if (req.body?.full_name !== undefined) {
            const name = normalizeName(req.body.full_name);
            if (name.error)
                return res.status(400).json({ error: name.error });
            updates.full_name = name.value;
        }
        if (req.body?.department !== undefined) {
            const dept = normalizeDepartment(req.body.department);
            if (dept.error)
                return res.status(400).json({ error: dept.error });
            updates.department = dept.value;
        }
        if (req.body?.roll_number !== undefined) {
            const roll = normalizeRoll(req.body.roll_number);
            if (roll.error)
                return res.status(400).json({ error: roll.error });
            const duplicate = await db
                .prepare('SELECT id FROM members WHERE roll_number = ? AND id <> ?')
                .get(roll.value, id);
            if (duplicate) {
                return res.status(409).json({ error: 'A member with this roll number is already registered.' });
            }
            updates.roll_number = roll.value;
        }
        if (req.body?.contact_number !== undefined) {
            const contact = normalizeContact(req.body.contact_number);
            if (contact.error)
                return res.status(400).json({ error: contact.error });
            updates.contact_number = contact.value;
        }
        if (req.body?.membership_type !== undefined) {
            const type = str(req.body.membership_type, 20).toLowerCase();
            if (!MEMBERSHIP_TYPES.has(type)) {
                return res.status(400).json({ error: 'Membership type must be general or executive.' });
            }
            if (type !== existing.membership_type && existing.payment_status === 'pending') {
                const settings = await getSettings(db);
                updates.amount = type === 'executive' ? settings.executive_fee : settings.general_fee;
            }
            updates.membership_type = type;
        }
        if (req.body?.notes !== undefined)
            updates.notes = normalizeNotes(req.body.notes) || null;
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nothing to update.' });
        }
        updates.updated_at = new Date().toISOString();
        const assignments = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
        try {
            await db.prepare(`UPDATE members SET ${assignments} WHERE id = ?`).run(...Object.values(updates), id);
        }
        catch (error) {
            if ((error.code === '23505' || String(error.message).includes('UNIQUE'))) {
                return res.status(409).json({ error: 'A member with this roll number is already registered.' });
            }
            throw error;
        }
        res.json({ member: await findMember(db, id) });
    });
    router.delete('/members/:id', adminRequired, async (req, res) => {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1)
            return res.status(400).json({ error: 'Invalid member id.' });
        const result = await db.prepare('DELETE FROM members WHERE id = ?').run(id);
        if (Number(result.changes) === 0)
            return res.status(404).json({ error: 'Member not found.' });
        res.json({ ok: true });
    });
    router.post('/members/:id/payment', async (req, res) => {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1)
            return res.status(400).json({ error: 'Invalid member id.' });
        const existing = await findMember(db, id);
        if (!existing)
            return res.status(404).json({ error: 'Member not found.' });
        const mode = str(req.body?.payment_mode, 20).toLowerCase() || existing.payment_mode;
        if (!PAYMENT_MODES.has(mode)) {
            return res.status(400).json({ error: 'Payment mode must be online or offline.' });
        }
        const status = str(req.body?.payment_status, 20).toLowerCase();
        if (!PAYMENT_STATUSES.has(status)) {
            return res.status(400).json({ error: 'Payment status must be paid or pending.' });
        }
        const reference = normalizeReference(req.body?.transaction_ref);
        if (reference.error)
            return res.status(400).json({ error: reference.error });
        const finalReference = reference.value || existing.transaction_ref || null;
        if (status === 'paid' && mode === 'online' && !finalReference) {
            return res.status(400).json({ error: 'Add the online transaction reference before marking paid.' });
        }
        const paidAt = status === 'paid' ? existing.paid_at || new Date().toISOString() : null;
        await db.prepare(`UPDATE members
          SET payment_mode = ?, payment_status = ?, transaction_ref = ?, paid_at = ?, updated_at = ?
        WHERE id = ?`).run(mode, status, finalReference, paidAt, new Date().toISOString(), id);
        res.json({ member: await findMember(db, id) });
    });
    // Demo online checkout. Replace with a real gateway callback before going live.
    router.post('/members/:id/pay-online', async (req, res) => {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1)
            return res.status(400).json({ error: 'Invalid member id.' });
        const existing = await findMember(db, id);
        if (!existing)
            return res.status(404).json({ error: 'Member not found.' });
        if (existing.payment_status === 'paid') {
            return res.status(409).json({ error: 'This member has already paid.' });
        }
        const reference = generateReference();
        await db.prepare(`UPDATE members
          SET payment_mode = 'online', payment_status = 'paid', transaction_ref = ?,
              paid_at = ?, updated_at = ?
        WHERE id = ?`).run(reference, new Date().toISOString(), new Date().toISOString(), id);
        res.json({
            member: await findMember(db, id),
            reference,
            simulated: true,
            message: 'Payment recorded through the demo gateway.',
        });
    });
    return router;
};
