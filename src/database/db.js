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
    verified INTEGER DEFAULT 0
  );
`);

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

function getOrCreateUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id, join_date) VALUES (?, ?)').run(
      userId,
      new Date().toISOString()
    );
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  return user;
}

function setVerified(userId, value = 1) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET verified = ? WHERE user_id = ?').run(value, userId);
}

function addWarn({ userId, moderatorId, reason, proofUrl, warnType, timeoutMinutes }) {
  getOrCreateUser(userId);
  db.prepare(
    `INSERT INTO warns (user_id, moderator_id, reason, proof_url, warn_type, timeout_minutes, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, moderatorId, reason, proofUrl || null, warnType, timeoutMinutes, new Date().toISOString());
  db.prepare('UPDATE users SET warns_count = warns_count + 1 WHERE user_id = ?').run(userId);
}

function getWarnCount(userId) {
  const user = getOrCreateUser(userId);
  return user.warns_count;
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
  db.prepare('UPDATE users SET warns_count = 0 WHERE user_id = ?').run(userId);
  return count;
}

module.exports = {
  db,
  getOrCreateUser,
  setVerified,
  addWarn,
  getWarnCount,
  getWarns,
  getWarnById,
  removeWarn,
  clearWarns,
};
