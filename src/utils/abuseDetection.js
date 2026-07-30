const config = require('./../config');
const { THEME, baseEmbed } = require('./embeds');

const actionLog = new Map();
const WINDOW_MS = 60 * 60 * 1000;
const THRESHOLD = 3;

function recordModAction(moderatorId) {
  const now = Date.now();
  const timestamps = (actionLog.get(moderatorId) || []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  actionLog.set(moderatorId, timestamps);
  return timestamps.length;
}

async function checkForAbuse(client, guild, moderatorMember, actionType) {
  if (!moderatorMember) return;
  const count = recordModAction(moderatorMember.id);
  if (count < THRESHOLD) return;

  actionLog.delete(moderatorMember.id);

  let timeoutApplied = true;
  try {
    await moderatorMember.timeout(30 * 60 * 1000, 'Automatic security lock: unusual moderation activity detected');
  } catch (err) {
    timeoutApplied = false;
  }

  try {
    const logChannel = await client.channels.fetch(config.channels.cmdsLogs);
    const leadershipRoleIds = [config.roles.manager, config.roles.coFounder, config.roles.founder].filter(Boolean);
    const owner = await guild.fetchOwner().catch(() => null);

    const embed = baseEmbed(client, {
      color: THEME.colors.danger,
      authorName: moderatorMember.user.tag,
      authorIcon: moderatorMember.user.displayAvatarURL(),
      title: '🚨 SECURITY ALERT — Unusual Staff Activity',
      description:
        `${moderatorMember} performed **${THRESHOLD}+ ${actionType} actions within the last hour**.\n\n` +
        `**Auto-response:** ${timeoutApplied ? 'Timed out for 30 minutes ✅' : 'Could not time out — likely too high rank ❌'}\n\n` +
        'Please review their recent actions in this channel immediately.',
    });

    await logChannel.send({
      content: `${leadershipRoleIds.map((id) => `<@&${id}>`).join(' ')} ${owner ? owner.toString() : ''}`.trim(),
      embeds: [embed],
      allowedMentions: { roles: leadershipRoleIds, users: owner ? [owner.id] : [] },
    });
  } catch (err) {
    console.error('Failed to send security alert:', err);
  }
}

module.exports = { checkForAbuse };
