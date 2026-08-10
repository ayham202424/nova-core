const config = require('../config');
const { addWarn, getWarnStreak, getWarnCount, getWarns } = require('../database/db');
const { getWarnLevel } = require('./warnLevels');
const { formatDuration } = require('./duration');
const { baseEmbed, THEME } = require('./embeds');
const { getOwnerPingContent } = require('./ownerPing');

const FLAG_MILESTONES = [3, 5, 8, 12];
const OWNER_PING_THRESHOLD_MINUTES = 300; // 5 hours

async function checkSuspiciousFlag(client, targetUser, totalWarns) {
  if (!FLAG_MILESTONES.includes(totalWarns)) return;

  try {
    const recentWarns = getWarns(targetUser.id).slice(0, 5);
    const logChannel = await client.channels.fetch(config.channels.cmdsLogs);
    const pingRoleIds = [config.roles.staff, config.roles.mod, config.roles.manager].filter(Boolean);

    const embed = baseEmbed(client, {
      color: THEME.colors.danger,
      authorName: targetUser.tag,
      authorIcon: targetUser.displayAvatarURL(),
      title: '🚩 Suspicious Activity — Repeated Violations',
      description:
        `${targetUser} (\`${targetUser.id}\`) has reached **${totalWarns} total warnings**. Please keep an eye on this user.\n\n` +
        `**Account created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
      fields: recentWarns.map((w) => ({
        name: `${w.warn_type} — <t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R>`,
        value: w.reason.slice(0, 200),
      })),
    });

    await logChannel.send({
      content: pingRoleIds.map((id) => `<@&${id}>`).join(' '),
      embeds: [embed],
      allowedMentions: { roles: pingRoleIds },
    });
  } catch (err) {
    console.error('Failed to send suspicious activity flag:', err);
  }
}

async function issueWarn({ client, guild, targetUser, moderatorLabel, moderatorId, reason, proofUrl, forcedLevel }) {
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
  const streak = getWarnStreak(targetUser.id);
  const level = forcedLevel || getWarnLevel(streak);

  addWarn({
    userId: targetUser.id,
    moderatorId: moderatorId || client.user.id,
    reason,
    proofUrl: proofUrl || null,
    warnType: level.name,
    timeoutMinutes: level.timeoutMinutes,
    streak,
  });

  let timeoutApplied = true;
  if (targetMember) {
    try {
      await targetMember.timeout(level.timeoutMinutes * 60 * 1000, `${level.name} — ${reason}`);
    } catch (err) {
      timeoutApplied = false;
    }
  } else {
    timeoutApplied = false;
  }

  let dmSent = true;
  try {
    const dmEmbed = baseEmbed(client, {
      color: level.color,
      title: `${level.emoji} ${level.name}`,
      description:
        `You have received a warning in **Nova-Creations**.\n\n` +
        `**Reason:** ${reason}\n` +
        `**Issued by:** ${moderatorLabel}\n` +
        `**Timeout duration:** ${formatDuration(level.timeoutMinutes)}\n` +
        `**Warning streak:** ${streak} (resets after 24h with no new warnings)\n` +
        (proofUrl ? `**Proof:** [View](${proofUrl})` : ''),
    });
    await targetUser.send({ embeds: [dmEmbed] });
  } catch (err) {
    dmSent = false;
  }

  const ownerPingNeeded = level.timeoutMinutes > OWNER_PING_THRESHOLD_MINUTES;
  let ownerPingContent = '';
  let ownerId = null;
  if (ownerPingNeeded) {
    const result = await getOwnerPingContent(guild);
    ownerPingContent = result.content;
    ownerId = result.ownerId;
  }

  try {
    const logChannel = await client.channels.fetch(config.channels.cmdsLogs);
    const logEmbed = baseEmbed(client, {
      color: level.color,
      authorName: targetUser.tag,
      authorIcon: targetUser.displayAvatarURL(),
      title: `${level.emoji} Warn Issued — ${level.name}`,
      description:
        `**User:** ${targetUser} (\`${targetUser.id}\`)\n` +
        `**Issued by:** ${moderatorLabel}\n` +
        `**Timeout:** ${formatDuration(level.timeoutMinutes)} (${timeoutApplied ? 'applied ✅' : 'failed ❌'})\n` +
        `**Warning streak:** ${streak}\n` +
        `**DM sent:** ${dmSent ? 'Yes ✅' : 'No ❌'}` +
        (ownerPingNeeded ? '\n\n🚨 Severe timeout — owner notified.' : ''),
      fields: [{ name: 'Reason', value: reason }],
      image: proofUrl || null,
    });
    await logChannel.send({
      content: ownerPingContent || undefined,
      embeds: [logEmbed],
      allowedMentions: ownerId ? { users: [ownerId] } : undefined,
    });
  } catch (err) {
    console.error('Failed to log warn:', err);
  }

  const totalWarns = getWarnCount(targetUser.id);
  await checkSuspiciousFlag(client, targetUser, totalWarns);

  return { level, streak, timeoutApplied, dmSent };
}

module.exports = { issueWarn };
