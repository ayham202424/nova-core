const { getOrCreateUser } = require('../database/db');

function getThreatLevel(userId) {
  const user = getOrCreateUser(userId);
  const warns = user.warns_count || 0;
  const bans = user.bans_count || 0;
  const kicks = user.kicks_count || 0;
  const score = warns + bans * 3 + kicks * 2;

  if (bans >= 2 || score >= 12) return { label: 'High Risk', emoji: '🔴' };
  if (bans >= 1 || score >= 6) return { label: 'Elevated Risk', emoji: '🟠' };
  if (score >= 2) return { label: 'Minor Concerns', emoji: '🟡' };
  return { label: 'Clean Record', emoji: '🟢' };
}

module.exports = { getThreatLevel };
