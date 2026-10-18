'use strict';
const DEFAULT_SETTINGS = {
    society_name: 'The Debating Society',
    tagline: 'Argue well. Think better.',
    currency: '৳',
    general_fee: '500',
    executive_fee: '1500',
};
async function getSettings(db) {
    const rows = await db.prepare('SELECT key, value FROM settings').all();
    const raw = {};
    for (const row of rows)
        raw[row.key] = row.value;
    return {
        society_name: raw.society_name || DEFAULT_SETTINGS.society_name,
        tagline: raw.tagline || DEFAULT_SETTINGS.tagline,
        currency: raw.currency || DEFAULT_SETTINGS.currency,
        general_fee: Number(raw.general_fee ?? DEFAULT_SETTINGS.general_fee),
        executive_fee: Number(raw.executive_fee ?? DEFAULT_SETTINGS.executive_fee),
    };
}
const EDITABLE_SETTINGS = new Set(['society_name', 'tagline', 'currency', 'general_fee', 'executive_fee']);
async function updateSettings(db, patch) {
    const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const [key, value] of Object.entries(patch)) {
        if (!EDITABLE_SETTINGS.has(key))
            continue;
        await upsert.run(key, String(value));
    }
    return await getSettings(db);
}
async function nextMemberCode(db, year = new Date().getFullYear()) {
    const key = `member_${year}`;
    await db.prepare('INSERT INTO counters (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = counters.value + 1').run(key);
    const row = await db.prepare('SELECT value FROM counters WHERE key = ?').get(key);
    return `DS-${year}-${String(row.value).padStart(4, '0')}`;
}
async function nextReceiptNo(db, year = new Date().getFullYear()) {
    const key = `receipt_${year}`;
    await db.prepare('INSERT INTO counters (key, value) VALUES (?, 1) ON CONFLICT(key) DO UPDATE SET value = counters.value + 1').run(key);
    const row = await db.prepare('SELECT value FROM counters WHERE key = ?').get(key);
    return `RCPT-${year}-${String(row.value).padStart(4, '0')}`;
}
module.exports = { getSettings, updateSettings, nextMemberCode, nextReceiptNo, DEFAULT_SETTINGS };
