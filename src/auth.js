'use strict';
const crypto = require('node:crypto');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const COOKIE_NAME = 'ds_session';
function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}
function verifyPassword(password, stored) {
    try {
        const [scheme, saltHex, hashHex] = String(stored).split('$');
        if (scheme !== 'scrypt' || !saltHex || !hashHex)
            return false;
        const expected = Buffer.from(hashHex, 'hex');
        const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
        return crypto.timingSafeEqual(actual, expected);
    }
    catch {
        return false;
    }
}
function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}
function parseCookies(header) {
    const out = {};
    if (!header)
        return out;
    for (const part of String(header).split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1)
            continue;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (!key)
            continue;
        try {
            out[key] = decodeURIComponent(value);
        }
        catch {
            out[key] = value;
        }
    }
    return out;
}
async function createSession(db, userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + SESSION_TTL_MS;
    await db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expiresAt);
    return { token, expiresAt };
}
async function destroySession(db, token) {
    if (!token)
        return;
    await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}
function setSessionCookie(req, res, token, expiresAt) {
    const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const parts = [
        `${COOKIE_NAME}=${token}`,
        'HttpOnly',
        'Path=/',
        'SameSite=Lax',
        `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
        `Expires=${new Date(expiresAt).toUTCString()}`,
    ];
    if (secure)
        parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}
function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}
function getSessionToken(req) {
    return parseCookies(req.headers.cookie)[COOKIE_NAME] || null;
}
async function currentUser(db, req) {
    if (req.identityUser) return req.identityUser;
    const token = getSessionToken(req);
    if (!token)
        return null;
    const row = await db
        .prepare(`SELECT u.id, u.username, u.full_name, u.role, u.active, s.expires_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?`)
        .get(sha256(token));
    if (!row || !row.active || Number(row.expires_at) < Date.now())
        return null;
    return { id: row.id, username: row.username, full_name: row.full_name, role: row.role };
}
function authRequired(db) {
    return async (req, res, next) => {
        const user = await currentUser(db, req);
        if (!user)
            return res.status(401).json({ error: 'Please sign in to continue.' });
        req.user = user;
        next();
    };
}
function adminRequired(req, res, next) {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only an admin can do that.' });
    }
    next();
}
module.exports = {
    SESSION_TTL_MS,
    hashPassword,
    verifyPassword,
    createSession,
    destroySession,
    setSessionCookie,
    clearSessionCookie,
    getSessionToken,
    currentUser,
    authRequired,
    adminRequired,
};
