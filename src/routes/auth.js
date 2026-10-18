'use strict';
const express = require('express');
const { verifyPassword, hashPassword, createSession, destroySession, setSessionCookie, clearSessionCookie, getSessionToken, currentUser, authRequired, } = require('../auth');
const { str, validatePassword } = require('../validate');
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;
function loginKey(req, username) {
    return `${req.ip || 'local'}|${username.toLowerCase()}`;
}
async function checkLimit(db, key) {
    const record = await db.prepare('SELECT count, reset_at FROM login_attempts WHERE key = ?').get(key);
    return !record || Number(record.reset_at) < Date.now() || Number(record.count) < MAX_ATTEMPTS;
}
async function noteFailure(db, key) {
    const now = Date.now();
    await db.prepare('DELETE FROM login_attempts WHERE reset_at < ?').run(now);
    await db.prepare(`INSERT INTO login_attempts (key, count, reset_at) VALUES (?, 1, ?)
        ON CONFLICT(key) DO UPDATE SET count = login_attempts.count + 1`).run(key, now + WINDOW_MS);
}

module.exports = function authRoutes(db) {
    const router = express.Router();
    router.post('/login', async (req, res) => {
        const username = str(req.body?.username, 30).toLowerCase();
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        if (!username || !password) {
            return res.status(400).json({ error: 'Enter your username and password.' });
        }
        const key = loginKey(req, username);
        if (!await checkLimit(db, key)) {
            return res
                .status(429)
                .json({ error: 'Too many failed attempts. Please wait a few minutes and try again.' });
        }
        const user = await db
            .prepare('SELECT id, username, full_name, role, active, password_hash FROM users WHERE username = ?')
            .get(username);
        if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
            await noteFailure(db, key);
            return res.status(401).json({ error: 'Incorrect username or password.' });
        }
        await db.prepare('DELETE FROM login_attempts WHERE key = ?').run(key);
        const { token, expiresAt } = await createSession(db, user.id);
        setSessionCookie(req, res, token, expiresAt);
        res.json({
            user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
        });
    });
    router.post('/logout', async (req, res) => {
        await destroySession(db, getSessionToken(req));
        clearSessionCookie(res);
        res.json({ ok: true });
    });
    router.get('/me', async (req, res) => {
        const user = await currentUser(db, req);
        if (!user)
            return res.status(401).json({ error: 'Not signed in.' });
        res.json({ user });
    });
    router.post('/password', authRequired(db), async (req, res) => {
        const currentPassword = typeof req.body?.current_password === 'string' ? req.body.current_password : '';
        const next = validatePassword(req.body?.new_password);
        if (next.error)
            return res.status(400).json({ error: next.error });
        if (currentPassword === next.value) {
            return res.status(400).json({ error: 'New password must be different from the current one.' });
        }
        const row = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
        if (!row || !verifyPassword(currentPassword, row.password_hash)) {
            return res.status(400).json({ error: 'Current password is incorrect.' });
        }
        await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next.value), req.user.id);
        // Sign out every session, including this one; the client returns to login.
        await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
        clearSessionCookie(res);
        res.json({ ok: true, message: 'Password updated. Please sign in again.' });
    });
    return router;
};
