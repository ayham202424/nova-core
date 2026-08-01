const Database = require('better-sqlite3');
const path = require('path');
const { MAX_LEVEL, xpForNextLevel } = require('../utils/xpCurve');

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
  "ALTER TABLE users ADD COLUMN tickets_claimed_count INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN rating_sum INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN rating_count INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN last_spam_notice_at TEXT",
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

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT,
    message_id TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_role_id TEXT,
    deadline TEXT,
    status TEXT DEFAULT 'open',
    claimed_by TEXT,
    allow_multiple_claims INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    cancelled_at TEXT
  );
`);

try {
  db.exec("ALTER TABLE tasks ADD COLUMN allow_multiple_claims INTEGER DEFAULT 0");
} catch (err) {
  // column already exists — safe to ignore
}

db.exec(`
  CREATE TABLE IF NOT EXISTS task_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT,
    opener_id TEXT NOT NULL,
    category TEXT NOT NULL,
    answers TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    claimed_by TEXT,
    created_at TEXT NOT NULL,
    claimed_at TEXT,
    closed_at TEXT,
    rating INTEGER,
    feedback TEXT,
    close_reason TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    author_tag TEXT NOT NULL,
    content TEXT,
    timestamp TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS message_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS xp_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_state (
    key TEXT PRIMARY KEY,
    value TEXT
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

function createTask({ title, description, assignedRoleId, deadline, createdBy, allowMultipleClaims }) {
  const info = db.prepare(
    `INSERT INTO tasks (title, description, assigned_role_id, deadline, created_by, created_at, allow_multiple_claims)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(title, description, assignedRoleId || null, deadline || null, createdBy, new Date().toISOString(), allowMultipleClaims ? 1 : 0);
  return info.lastInsertRowid;
}

function setTaskMessage(taskId, channelId, messageId) {
  db.prepare('UPDATE tasks SET channel_id = ?, message_id = ? WHERE id = ?').run(channelId, messageId, taskId);
}

function getTask(taskId) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
}

function claimTask(taskId, staffId) {
  db.prepare("UPDATE tasks SET status = 'claimed', claimed_by = ? WHERE id = ?").run(staffId, taskId);
}

function completeTask(taskId) {
  db.prepare("UPDATE tasks SET status = 'done', completed_at = ? WHERE id = ?").run(new Date().toISOString(), taskId);
}

function cancelTask(taskId) {
  db.prepare("UPDATE tasks SET status = 'cancelled', cancelled_at = ? WHERE id = ?").run(new Date().toISOString(), taskId);
}

function addTaskClaim(taskId, userId) {
  const existing = db.prepare('SELECT * FROM task_claims WHERE task_id = ? AND user_id = ?').get(taskId, userId);
  if (existing) return false;
  db.prepare('INSERT INTO task_claims (task_id, user_id, claimed_at) VALUES (?, ?, ?)').run(taskId, userId, new Date().toISOString());
  return true;
}

function getTaskClaims(taskId) {
  return db.prepare('SELECT * FROM task_claims WHERE task_id = ? ORDER BY id ASC').all(taskId);
}

function hasUserClaimedTask(taskId, userId) {
  return Boolean(db.prepare('SELECT 1 FROM task_claims WHERE task_id = ? AND user_id = ?').get(taskId, userId));
}

function incrementTicketsOpened(userId) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET tickets_opened = tickets_opened + 1 WHERE user_id = ?').run(userId);
}

function createSupportTicket({ openerId, category, answers }) {
  incrementTicketsOpened(openerId);
  const info = db.prepare(
    `INSERT INTO support_tickets (opener_id, category, answers, created_at) VALUES (?, ?, ?, ?)`
  ).run(openerId, category, JSON.stringify(answers), new Date().toISOString());
  return info.lastInsertRowid;
}

function setSupportTicketChannel(ticketId, channelId) {
  db.prepare('UPDATE support_tickets SET channel_id = ? WHERE id = ?').run(channelId, ticketId);
}

function getOpenSupportTicketByUser(userId) {
  return db.prepare("SELECT * FROM support_tickets WHERE opener_id = ? AND status IN ('open', 'claimed')").get(userId);
}

function getSupportTicketByChannel(channelId) {
  return db.prepare('SELECT * FROM support_tickets WHERE channel_id = ?').get(channelId);
}

function getSupportTicket(ticketId) {
  return db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);
}

function claimSupportTicket(ticketId, staffId) {
  db.prepare("UPDATE support_tickets SET status = 'claimed', claimed_by = ?, claimed_at = ? WHERE id = ?").run(
    staffId,
    new Date().toISOString(),
    ticketId
  );
  getOrCreateUser(staffId);
  db.prepare('UPDATE users SET tickets_claimed_count = tickets_claimed_count + 1 WHERE user_id = ?').run(staffId);
}

function completeSupportTicket(ticketId, rating, feedback) {
  const ticket = getSupportTicket(ticketId);
  db.prepare("UPDATE support_tickets SET status = 'completed', closed_at = ?, rating = ?, feedback = ? WHERE id = ?").run(
    new Date().toISOString(),
    rating || null,
    feedback || null,
    ticketId
  );
  if (ticket && ticket.claimed_by && rating) {
    getOrCreateUser(ticket.claimed_by);
    db.prepare('UPDATE users SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE user_id = ?').run(rating, ticket.claimed_by);
  }
}

function closeInvalidSupportTicket(ticketId, reason) {
  db.prepare("UPDATE support_tickets SET status = 'closed_invalid', closed_at = ?, close_reason = ? WHERE id = ?").run(
    new Date().toISOString(),
    reason,
    ticketId
  );
}

function cancelSupportTicket(ticketId) {
  db.prepare("UPDATE support_tickets SET status = 'cancelled', closed_at = ? WHERE id = ?").run(new Date().toISOString(), ticketId);
}

function reopenSupportTicket(ticketId, channelId) {
  const ticket = getSupportTicket(ticketId);
  const newStatus = ticket && ticket.claimed_by ? 'claimed' : 'open';
  db.prepare('UPDATE support_tickets SET channel_id = ?, status = ? WHERE id = ?').run(channelId, newStatus, ticketId);
}

function addTicketMessage(ticketId, authorId, authorTag, content) {
  db.prepare(
    `INSERT INTO ticket_messages (ticket_id, author_id, author_tag, content, timestamp) VALUES (?, ?, ?, ?, ?)`
  ).run(ticketId, authorId, authorTag, content, new Date().toISOString());
}

function getTicketMessages(ticketId) {
  return db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY id ASC').all(ticketId);
}

function getStaffStats(staffId) {
  const user = getOrCreateUser(staffId);
  return {
    ticketsClaimedCount: user.tickets_claimed_count || 0,
    ratingCount: user.rating_count || 0,
    avgRating: user.rating_count > 0 ? (user.rating_sum / user.rating_count).toFixed(1) : null,
  };
}

function getSpamStage(userId) {
  const user = getOrCreateUser(userId);
  const now = Date.now();
  const last = user.last_spam_notice_at ? new Date(user.last_spam_notice_at).getTime() : null;
  if (!last || now - last > 24 * 60 * 60 * 1000) return 'notice';
  return 'escalate';
}

function recordSpamNotice(userId) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET last_spam_notice_at = ? WHERE user_id = ?').run(new Date().toISOString(), userId);
}

function incrementMessagesTotal(userId) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET messages_total = messages_total + 1 WHERE user_id = ?').run(userId);
}

function recordMessageActivity(userId) {
  db.prepare('INSERT INTO message_activity (user_id, timestamp) VALUES (?, ?)').run(userId, new Date().toISOString());
}

function recordXpActivity(userId, amount) {
  if (!amount) return;
  db.prepare('INSERT INTO xp_activity (user_id, amount, timestamp) VALUES (?, ?, ?)').run(userId, amount, new Date().toISOString());
}

function addXp(userId, baseAmount, isBooster) {
  const user = getOrCreateUser(userId);
  if (user.level >= MAX_LEVEL) return { leveledUp: false, oldLevel: user.level, newLevel: user.level, xpGained: 0 };

  const amount = isBooster ? Math.round(baseAmount * 1.5) : baseAmount;
  let newXp = user.xp + amount;
  let newLevel = user.level;

  while (newLevel < MAX_LEVEL && newXp >= xpForNextLevel(newLevel)) {
    newXp -= xpForNextLevel(newLevel);
    newLevel++;
  }

  db.prepare('UPDATE users SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);

  return { leveledUp: newLevel > user.level, oldLevel: user.level, newLevel, xpGained: amount };
}

function getLevelLeaderboard(limit = 10) {
  return db.prepare('SELECT user_id, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT ?').all(limit);
}

function getMessageLeaderboard(cutoffMs, limit = 10) {
  if (cutoffMs) {
    const cutoffIso = new Date(cutoffMs).toISOString();
    return db
      .prepare('SELECT user_id, COUNT(*) as total FROM message_activity WHERE timestamp >= ? GROUP BY user_id ORDER BY total DESC LIMIT ?')
      .all(cutoffIso, limit);
  }
  return db.prepare('SELECT user_id, COUNT(*) as total FROM message_activity GROUP BY user_id ORDER BY total DESC LIMIT ?').all(limit);
}

function getXpGainedLeaderboard(cutoffMs, limit = 10) {
  const cutoffIso = new Date(cutoffMs).toISOString();
  return db
    .prepare('SELECT user_id, SUM(amount) as total FROM xp_activity WHERE timestamp >= ? GROUP BY user_id ORDER BY total DESC LIMIT ?')
    .all(cutoffIso, limit);
}

function getBotState(key) {
  const row = db.prepare('SELECT value FROM bot_state WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setBotState(key, value) {
  db.prepare('INSERT INTO bot_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
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
  createTask,
  setTaskMessage,
  getTask,
  claimTask,
  completeTask,
  cancelTask,
  addTaskClaim,
  getTaskClaims,
  hasUserClaimedTask,
  incrementTicketsOpened,
  createSupportTicket,
  setSupportTicketChannel,
  getOpenSupportTicketByUser,
  getSupportTicketByChannel,
  getSupportTicket,
  claimSupportTicket,
  completeSupportTicket,
  closeInvalidSupportTicket,
  cancelSupportTicket,
  reopenSupportTicket,
  addTicketMessage,
  getTicketMessages,
  getStaffStats,
  getSpamStage,
  recordSpamNotice,
  incrementMessagesTotal,
  recordMessageActivity,
  recordXpActivity,
  addXp,
  getLevelLeaderboard,
  getMessageLeaderboard,
  getXpGainedLeaderboard,
  getBotState,
  setBotState,
};
