'use strict';
const express = require('express');
const { authRequired, adminRequired, hashPassword } = require('../auth');
const { getSettings, updateSettings } = require('../db-settings');
const { str, normalizeUsername, validatePassword, normalizeName, normalizeFee, } = require('../validate');
function publicUser(row) {
    return {
        id: row.id,
        username: row.username,
        full_name: row.full_name,
        role: row.role,
        active: Boolean(row.active),
        created_at: row.created_at,
    };
}
module.exports = function adminRoutes(db) {
    const router = express.Router();
    router.use(authRequired(db));
    router.get('/settings', async (req, res) => {
        res.json({ settings: await getSettings(db) });
    });
    router.patch('/settings', adminRequired, async (req, res) => {
        const patch = {};
        if (req.body?.society_name !== undefined) {
            const name = str(req.body.society_name, 80);
            if (name.length < 2) {
                return res.status(400).json({ error: 'Society name must be at least 2 characters.' });
            }
            patch.society_name = name;
        }
        if (req.body?.tagline !== undefined) {
            patch.tagline = str(req.body.tagline, 90);
        }
        if (req.body?.currency !== undefined) {
            const currency = str(req.body.currency, 4);
            if (!currency)
                return res.status(400).json({ error: 'Currency symbol is required.' });
            patch.currency = currency;
        }
        if (req.body?.general_fee !== undefined) {
            const fee = normalizeFee(req.body.general_fee, 'General membership fee');
            if (fee.error)
                return res.status(400).json({ error: fee.error });
            patch.general_fee = fee.value;
        }
        if (req.body?.executive_fee !== undefined) {
            const fee = normalizeFee(req.body.executive_fee, 'Executive membership fee');
            if (fee.error)
                return res.status(400).json({ error: fee.error });
            patch.executive_fee = fee.value;
        }
        if (Object.keys(patch).length === 0) {
            return res.status(400).json({ error: 'Nothing to update.' });
        }
        res.json({ settings: await updateSettings(db, patch) });
    });
    router.get('/users', adminRequired, async (req, res) => {
        const rows = await db
            .prepare('SELECT id, username, full_name, role, active, created_at FROM users ORDER BY id ASC')
            .all();
        res.json({ users: rows.map(publicUser) });
    });
    router.post('/users', adminRequired, async (req, res) => {
        const username = normalizeUsername(req.body?.username);
        if (username.error)
            return res.status(400).json({ error: username.error });
        const name = normalizeName(req.body?.full_name);
        if (name.error)
            return res.status(400).json({ error: name.error });
        const password = validatePassword(req.body?.password);
        if (password.error)
            return res.status(400).json({ error: password.error });
        const role = str(req.body?.role, 20).toLowerCase() || 'desk';
        if (!['admin', 'desk'].includes(role)) {
            return res.status(400).json({ error: 'Role must be admin or desk.' });
        }
        const duplicate = await db.prepare('SELECT id FROM users WHERE username = ?').get(username.value);
        if (duplicate)
            return res.status(409).json({ error: 'That username is already taken.' });
        const result = await db
            .prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)')
            .run(username.value, hashPassword(password.value), name.value, role);
        const row = await db
            .prepare('SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?')
            .get(Number(result.lastInsertRowid));
        res.status(201).json({ user: publicUser(row) });
    });
    router.patch('/users/:id', adminRequired, async (req, res) => {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id < 1)
            return res.status(400).json({ error: 'Invalid user id.' });
        const target = await db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!target)
            return res.status(404).json({ error: 'User not found.' });
        const updates = {};
        if (req.body?.full_name !== undefined) {
            const name = normalizeName(req.body.full_name);
            if (name.error)
                return res.status(400).json({ error: name.error });
            updates.full_name = name.value;
        }
        if (req.body?.active !== undefined) {
            const active = Boolean(req.body.active);
            if (id === req.user.id && !active) {
                return res.status(400).json({ error: 'You cannot deactivate your own account.' });
            }
            updates.active = active ? 1 : 0;
        }
        if (req.body?.password !== undefined) {
            if (target.identity_id) return res.status(400).json({ error: 'Manage this email account password through Netlify Identity. Username account passwords can be reset here.' });
            const password = validatePassword(req.body.password);
            if (password.error)
                return res.status(400).json({ error: password.error });
            updates.password_hash = hashPassword(password.value);
            await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'Nothing to update.' });
        }
        const assignments = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
        await db.prepare(`UPDATE users SET ${assignments} WHERE id = ?`).run(...Object.values(updates), id);
        if (updates.active === 0)
            await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
        const row = await db
            .prepare('SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?')
            .get(id);
        res.json({ user: publicUser(row) });
    });
    return router;
};
