const config = require('../config');
const { addWarn, getWarnStreak } = require('../database/db');
const { getWarnLevel } = require('./warnLevels');
const { formatDuration } = require('./duration');
const { baseEmbed } = require('./embeds');

async function issueWarn({ client, guild, targetUser, moderatorLabel, moderatorId, reason, proofUrl }) {
  const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
  const streak = getWarnStreak(targetUser.id);
  const level = getWarnLevel(streak);

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
        (proofUrl ? `**Proof:** [View](${proofUrl})` : '**Proof:** None provided'),
    });
    await targetUser.send({ embeds: [dmEmbed] });
  } catch (err) {
    dmSent = false;
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
        `**DM sent:** ${dmSent ? 'Yes ✅' : 'No ❌'}`,
      fields: [{ name: 'Reason', value: reason }],
      image: proofUrl || null,
    });
    await logChannel.send({ embeds: [logEmbed] });
  } catch (err) {
    console.error('Failed to log warn:', err);
  }

  return { level, streak, timeoutApplied, dmSent };
}

module.exports = { issueWarn };
