const Database = require('better-sqlite3');
const path = require('path');
const { MAX_LEVEL, xpForNextLevel } = require('../utils/xpCurve');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../nova-core.db');
const db = new Database(dbPath);
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
  "ALTER TABLE users ADD COLUMN bans_count INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN kicks_count INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN invites_count INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN join_count INTEGER DEFAULT 0",
  "ALTER TABLE users ADD COLUMN is_og_member INTEGER DEFAULT 0",
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

db.exec(`
  CREATE TABLE IF NOT EXISTS appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    user_tag TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at TEXT,
    review_note TEXT,
    channel_id TEXT,
    message_id TEXT,
    created_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS appeal_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appeal_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    filename TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT,
    message_id TEXT,
    title TEXT NOT NULL,
    prize TEXT NOT NULL,
    requirement_type TEXT DEFAULT 'none',
    requirement_value INTEGER,
    winner_count INTEGER DEFAULT 1,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS giveaway_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    giveaway_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    entered_at TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS invite_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inviter_id TEXT NOT NULL,
    invited_id TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    left_at TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS timers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    title TEXT,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL
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

function setUserLevel(userId, newLevel) {
  const user = getOrCreateUser(userId);
  const oldLevel = user.level;
  db.prepare('UPDATE users SET level = ?, xp = 0 WHERE user_id = ?').run(newLevel, userId);
  return oldLevel;
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

function incrementBanCount(userId) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET bans_count = bans_count + 1 WHERE user_id = ?').run(userId);
}

function incrementKickCount(userId) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET kicks_count = kicks_count + 1 WHERE user_id = ?').run(userId);
}

function createAppeal({ userId, userTag, type, reason }) {
  const info = db.prepare(
    `INSERT INTO appeals (user_id, user_tag, type, reason, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, userTag, type, reason, new Date().toISOString());
  return info.lastInsertRowid;
}

function setAppealMessage(appealId, channelId, messageId) {
  db.prepare('UPDATE appeals SET channel_id = ?, message_id = ? WHERE id = ?').run(channelId, messageId, appealId);
}

function getAppeal(appealId) {
  return db.prepare('SELECT * FROM appeals WHERE id = ?').get(appealId);
}

function getOpenAppealByUser(userId) {
  return db.prepare("SELECT * FROM appeals WHERE user_id = ? AND status = 'pending'").get(userId);
}

function addAppealAttachment(appealId, url, filename) {
  db.prepare('INSERT INTO appeal_attachments (appeal_id, url, filename) VALUES (?, ?, ?)').run(appealId, url, filename || null);
}

function getAppealAttachments(appealId) {
  return db.prepare('SELECT * FROM appeal_attachments WHERE appeal_id = ?').all(appealId);
}

function updateAppealStatus(appealId, status, reviewedBy, reviewNote) {
  db.prepare('UPDATE appeals SET status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?').run(
    status,
    reviewedBy,
    new Date().toISOString(),
    reviewNote || null,
    appealId
  );
}

function incrementInvites(userId) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET invites_count = invites_count + 1 WHERE user_id = ?').run(userId);
}

function createGiveaway({ title, prize, requirementType, requirementValue, winnerCount, endTime, createdBy }) {
  const info = db.prepare(
    `INSERT INTO giveaways (title, prize, requirement_type, requirement_value, winner_count, end_time, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(title, prize, requirementType, requirementValue || null, winnerCount, endTime, createdBy, new Date().toISOString());
  return info.lastInsertRowid;
}

function setGiveawayMessage(giveawayId, channelId, messageId) {
  db.prepare('UPDATE giveaways SET channel_id = ?, message_id = ? WHERE id = ?').run(channelId, messageId, giveawayId);
}

function getGiveaway(giveawayId) {
  return db.prepare('SELECT * FROM giveaways WHERE id = ?').get(giveawayId);
}

function getActiveGiveaways() {
  return db.prepare("SELECT * FROM giveaways WHERE status = 'active'").all();
}

function addGiveawayEntry(giveawayId, userId) {
  const existing = db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?').get(giveawayId, userId);
  if (existing) return false;
  db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id, entered_at) VALUES (?, ?, ?)').run(giveawayId, userId, new Date().toISOString());
  return true;
}

function getGiveawayEntries(giveawayId) {
  return db.prepare('SELECT * FROM giveaway_entries WHERE giveaway_id = ?').all(giveawayId);
}

function hasEnteredGiveaway(giveawayId, userId) {
  return Boolean(db.prepare('SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?').get(giveawayId, userId));
}

function endGiveaway(giveawayId) {
  db.prepare("UPDATE giveaways SET status = 'ended' WHERE id = ?").run(giveawayId);
}

function cancelGiveaway(giveawayId) {
  db.prepare("UPDATE giveaways SET status = 'cancelled' WHERE id = ?").run(giveawayId);
}

function incrementJoinCount(userId) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET join_count = join_count + 1 WHERE user_id = ?').run(userId);
  return db.prepare('SELECT join_count FROM users WHERE user_id = ?').get(userId).join_count;
}

function setOgMember(userId) {
  getOrCreateUser(userId);
  db.prepare('UPDATE users SET is_og_member = 1 WHERE user_id = ?').run(userId);
}

function isOgMember(userId) {
  const user = getOrCreateUser(userId);
  return Boolean(user.is_og_member);
}

function createInviteRecord(inviterId, invitedId) {
  db.prepare('INSERT INTO invite_records (inviter_id, invited_id, joined_at) VALUES (?, ?, ?)').run(inviterId, invitedId, new Date().toISOString());
}

function closeInviteRecord(invitedId) {
  db.prepare("UPDATE invite_records SET left_at = ? WHERE invited_id = ? AND left_at IS NULL").run(new Date().toISOString(), invitedId);
}

function getInviteStats(userId) {
  const total = db.prepare('SELECT COUNT(*) as c FROM invite_records WHERE inviter_id = ?').get(userId).c;
  const stillHere = db.prepare('SELECT COUNT(*) as c FROM invite_records WHERE inviter_id = ? AND left_at IS NULL').get(userId).c;
  return { total, stillHere, left: total - stillHere };
}

function createTimer({ userId, channelId, title, endTime }) {
  const info = db.prepare(
    `INSERT INTO timers (user_id, channel_id, title, end_time, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(userId, channelId, title || null, endTime, new Date().toISOString());
  return info.lastInsertRowid;
}

function setTimerMessage(timerId, messageId) {
  db.prepare('UPDATE timers SET message_id = ? WHERE id = ?').run(messageId, timerId);
}

function getActiveTimerByUser(userId) {
  return db.prepare("SELECT * FROM timers WHERE user_id = ? AND status = 'active'").get(userId);
}

function getActiveTimers() {
  return db.prepare("SELECT * FROM timers WHERE status = 'active'").all();
}

function getTimer(timerId) {
  return db.prepare('SELECT * FROM timers WHERE id = ?').get(timerId);
}

function completeTimer(timerId) {
  db.prepare("UPDATE timers SET status = 'completed' WHERE id = ?").run(timerId);
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
  setUserLevel,
  getLevelLeaderboard,
  getMessageLeaderboard,
  getXpGainedLeaderboard,
  getBotState,
  setBotState,
  incrementBanCount,
  incrementKickCount,
  createAppeal,
  setAppealMessage,
  getAppeal,
  getOpenAppealByUser,
  addAppealAttachment,
  getAppealAttachments,
  updateAppealStatus,
  incrementInvites,
  createGiveaway,
  setGiveawayMessage,
  getGiveaway,
  getActiveGiveaways,
  addGiveawayEntry,
  getGiveawayEntries,
  hasEnteredGiveaway,
  endGiveaway,
  cancelGiveaway,
  incrementJoinCount,
  setOgMember,
  isOgMember,
  createInviteRecord,
  closeInviteRecord,
  getInviteStats,
  createTimer,
  setTimerMessage,
  getActiveTimerByUser,
  getActiveTimers,
  getTimer,
  completeTimer,
};
