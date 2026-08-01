const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { hasRank, RANKS } = require('../utils/permissions');
const { setUserLevel } = require('../database/db');
const { MAX_LEVEL } = require('../utils/xpCurve');
const { getMilestoneRoleId, MILESTONE_LEVELS } = require('../utils/levelRoles');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription("Manually set a member's level (Manager+ only).")
    .addUserOption((opt) => opt.setName('user').setDescription('The member to update').setRequired(true))
    .addIntegerOption((opt) =>
      opt.setName('level').setDescription(`New level (0-${MAX_LEVEL})`).setRequired(true).setMinValue(0).setMaxValue(MAX_LEVEL)
    ),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.MANAGER)) {
      return interaction.reply({ content: 'You need at least Manager rank to use this command.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const newLevel = interaction.options.getInteger('level');
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const oldLevel = setUserLevel(targetUser.id, newLevel);

    if (targetMember) {
      const oldRoleId = getMilestoneRoleId(oldLevel);
      const newRoleId = getMilestoneRoleId(newLevel);
      if (oldRoleId !== newRoleId) {
        try {
          if (oldRoleId) await targetMember.roles.remove(oldRoleId);
          if (newRoleId) await targetMember.roles.add(newRoleId);
        } catch (err) {
          console.error('Failed to sync milestone role on manual level set:', err);
        }
      }
    }

    try {
      const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
      const logEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.warning,
        authorName: targetUser.tag,
        authorIcon: targetUser.displayAvatarURL(),
        title: '🛠️ Level Manually Set',
        description: `**User:** ${targetUser} (\`${targetUser.id}\`)\n**Set by:** ${interaction.user} (\`${interaction.user.id}\`)\n**Level:** ${oldLevel} → ${newLevel}`,
      });
      await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
      console.error('Failed to log manual level set:', err);
    }

    if (targetMember) {
      try {
        const levelUpChannel = await interaction.client.channels.fetch(config.channels.levelUp).catch(() => null);
        if (levelUpChannel) {
          const isMilestone = MILESTONE_LEVELS.includes(newLevel);
          const announceEmbed = baseEmbed(interaction.client, {
            color: THEME.colors.primary,
            authorName: targetUser.tag,
            authorIcon: targetUser.displayAvatarURL(),
            title: '🛠️ Level Adjusted by Staff',
            description:
              `${targetMember}'s level was manually set to **Level ${newLevel}** by ${interaction.user}.` +
              (isMilestone && getMilestoneRoleId(newLevel) ? `\n🎁 Role: <@&${getMilestoneRoleId(newLevel)}>` : ''),
          });
          await levelUpChannel.send({ embeds: [announceEmbed] });
        }
      } catch (err) {
        console.error('Failed to announce manual level set:', err);
      }
    }

    await interaction.reply({ content: `${targetUser.tag}'s level has been set to ${newLevel} (was ${oldLevel}).`, ephemeral: true });
  },
};
