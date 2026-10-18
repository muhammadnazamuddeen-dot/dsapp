'use strict';

const express = require('express');
const {
  verifyPassword,
  hashPassword,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  currentUser,
  authRequired,
} = require('../auth');
const { str, validatePassword } = require('../validate');

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map();

function loginKey(req, username) {
  return `${req.ip || 'local'}|${username.toLowerCase()}`;
}

function checkLimit(key) {
  const record = attempts.get(key);
  if (!record || record.resetAt < Date.now()) return true;
  return record.count < MAX_ATTEMPTS;
}

function noteFailure(key) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || record.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    record.count += 1;
  }
  if (attempts.size > 5000) {
    for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
  }
}

module.exports = function authRoutes(db) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const username = str(req.body?.username, 30).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!username || !password) {
      return res.status(400).json({ error: 'Enter your username and password.' });
    }

    const key = loginKey(req, username);
    if (!checkLimit(key)) {
      return res
        .status(429)
        .json({ error: 'Too many failed attempts. Please wait a few minutes and try again.' });
    }

    const user = db
      .prepare('SELECT id, username, full_name, role, active, password_hash FROM users WHERE username = ?')
      .get(username);

    if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
      noteFailure(key);
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    attempts.delete(key);
    const { token, expiresAt } = createSession(db, user.id);
    setSessionCookie(req, res, token, expiresAt);
    res.json({
      user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role },
    });
  });

  router.post('/logout', (req, res) => {
    destroySession(db, getSessionToken(req));
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    const user = currentUser(db, req);
    if (!user) return res.status(401).json({ error: 'Not signed in.' });
    res.json({ user });
  });

  router.post('/password', authRequired(db), (req, res) => {
    const currentPassword = typeof req.body?.current_password === 'string' ? req.body.current_password : '';
    const next = validatePassword(req.body?.new_password);
    if (next.error) return res.status(400).json({ error: next.error });
    if (currentPassword === next.value) {
      return res.status(400).json({ error: 'New password must be different from the current one.' });
    }

    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!row || !verifyPassword(currentPassword, row.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next.value), req.user.id);
    // Sign out every session, including this one; the client returns to login.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
    clearSessionCookie(res);
    res.json({ ok: true, message: 'Password updated. Please sign in again.' });
  });

  return router;
};
