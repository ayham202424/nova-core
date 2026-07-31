const config = require('../config');
const { THEME, baseEmbed } = require('./embeds');
const { getMilestoneRoleId, MILESTONE_LEVELS } = require('./levelRoles');

async function announceLevelUp(client, guild, member, oldLevel, newLevel) {
  if (!member) return;

  const oldRoleId = getMilestoneRoleId(oldLevel);
  const newRoleId = getMilestoneRoleId(newLevel);

  if (oldRoleId !== newRoleId) {
    try {
      if (oldRoleId) await member.roles.remove(oldRoleId);
      if (newRoleId) await member.roles.add(newRoleId);
    } catch (err) {
      console.error('Failed to sync milestone role:', err);
    }
  }

  try {
    const channel = await client.channels.fetch(config.channels.levelUp);
    const isMilestone = MILESTONE_LEVELS.includes(newLevel);

    const embed = baseEmbed(client, {
      color: isMilestone ? THEME.colors.success : THEME.colors.primary,
      authorName: member.user.tag,
      authorIcon: member.user.displayAvatarURL(),
      title: isMilestone ? `🌟 Milestone Reached — Level ${newLevel}!` : '⬆️ Level Up!',
      description:
        `${member} went from **Level ${oldLevel}** to **Level ${newLevel}**.` +
        (isMilestone && newRoleId ? `\n\n🎁 New role unlocked: <@&${newRoleId}>` : ''),
      thumbnail: member.user.displayAvatarURL({ size: 128 }),
    });

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to send level-up announcement:', err);
  }
}

module.exports = { announceLevelUp };
