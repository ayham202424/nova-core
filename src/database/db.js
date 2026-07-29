const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../nova-core.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    messages_total INTEGER DEFAULT 0,
    join_date TEXT,
    warns_count INTEGER DEFAULT 0,
    tickets_opened INTEGER DEFAULT 0,
    verified INTEGER DEFAULT 0,
    warn_streak INTEGER DEFAULT 0,
    last_warn_at TEXT
  );
`);

const migrations = [
  "ALTER TABLE users ADD COLUMN warn_streak INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN last_warn_at TEXT",
];
for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch (err) {
    // column already exists — safe to ignore
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS warns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    proof_url TEXT,
    warn_type TEXT NOT NULL,
    timeout_minutes INTEGER NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT,
    buyer_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    roblox_username TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    claimed_by TEXT,
    created_at TEXT NOT NULL,
    claimed_at TEXT,
    closed_at TEXT,
    closed_by TEXT,
    close_reason TEXT
  );
`);

function getOrCreateUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id, join_date) VALUES (?, ?)').run(userId, new Date().toISOString());
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  return user;
}

function setVerified(userId, value = 1) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET verified = ? WHERE user_id = ?').run(value, userId);
}

function getWarnStreak(userId) {
  const user = getOrCreateUser(userId);
  const now = Date.now();
  const resetWindowMs = 24 * 60 * 60 * 1000;
  const last = user.last_warn_at ? new Date(user.last_warn_at).getTime() : null;
  if (!last || now - last > resetWindowMs) return 1;
  return user.warn_streak + 1;
}

function addWarn({ userId, moderatorId, reason, proofUrl, warnType, timeoutMinutes, streak }) {
  getOrCreateUser(userId);
  db.prepare(
    `INSERT INTO warns (user_id, moderator_id, reason, proof_url, warn_type, timeout_minutes, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, moderatorId, reason, proofUrl || null, warnType, timeoutMinutes, new Date().toISOString());
  db.prepare(
    'UPDATE users SET warns_count = warns_count + 1, warn_streak = ?, last_warn_at = ? WHERE user_id = ?'
  ).run(streak, new Date().toISOString(), userId);
}

function getWarnCount(userId) {
  return getOrCreateUser(userId).warns_count;
}

function getWarns(userId) {
  return db.prepare('SELECT * FROM warns WHERE user_id = ? ORDER BY id DESC').all(userId);
}

function getWarnById(warnId) {
  return db.prepare('SELECT * FROM warns WHERE id = ?').get(warnId);
}

function removeWarn(warnId) {
  const warn = getWarnById(warnId);
  if (!warn) return null;
  db.prepare('DELETE FROM warns WHERE id = ?').run(warnId);
  db.prepare('UPDATE users SET warns_count = MAX(warns_count - 1, 0) WHERE user_id = ?').run(warn.user_id);
  return warn;
}

function clearWarns(userId) {
  const count = db.prepare('SELECT COUNT(*) as c FROM warns WHERE user_id = ?').get(userId).c;
  db.prepare('DELETE FROM warns WHERE user_id = ?').run(userId);
  db.prepare('UPDATE users SET warns_count = 0, warn_streak = 0, last_warn_at = NULL WHERE user_id = ?').run(userId);
  return count;
}

function createTicket({ buyerId, itemType, robloxUsername, paymentMethod }) {
  const info = db.prepare(
    `INSERT INTO tickets (buyer_id, item_type, roblox_username, payment_method, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(buyerId, itemType, robloxUsername, paymentMethod, new Date().toISOString());
  return info.lastInsertRowid;
}

function setTicketChannel(ticketId, channelId) {
  db.prepare('UPDATE tickets SET channel_id = ? WHERE id = ?').run(channelId, ticketId);
}

function getOpenTicketByBuyer(buyerId) {
  return db.prepare("SELECT * FROM tickets WHERE buyer_id = ? AND status IN ('open', 'claimed')").get(buyerId);
}

function getTicketByChannel(channelId) {
  return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
}

function claimTicket(channelId, staffId) {
  db.prepare("UPDATE tickets SET status = 'claimed', claimed_by = ?, claimed_at = ? WHERE channel_id = ?").run(
    staffId,
    new Date().toISOString(),
    channelId
  );
}

function closeTicket(channelId, staffId, reason) {
  db.prepare("UPDATE tickets SET status = 'closed', closed_by = ?, closed_at = ?, close_reason = ? WHERE channel_id = ?").run(
    staffId,
    new Date().toISOString(),
    reason,
    channelId
  );
}

function cancelTicket(channelId) {
  db.prepare("UPDATE tickets SET status = 'cancelled' WHERE channel_id = ?").run(channelId);
}

module.exports = {
  db,
  getOrCreateUser,
  setVerified,
  getWarnStreak,
  addWarn,
  getWarnCount,
  getWarns,
  getWarnById,
  removeWarn,
  clearWarns,
  createTicket,
  setTicketChannel,
  getOpenTicketByBuyer,
  getTicketByChannel,
  claimTicket,
  closeTicket,
  cancelTicket,
};
