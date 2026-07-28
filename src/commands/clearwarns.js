const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { hasRank, RANKS } = require('../utils/permissions');
const { clearWarns } = require('../database/db');
const { baseEmbed, THEME } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription("Remove ALL warnings from a member's history.")
    .addUserOption((opt) => opt.setName('user').setDescription('The member to clear').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Why are you clearing this history?').setRequired(true)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.HEAD_MOD)) {
      return interaction.reply({ content: 'You need at least Head Mod rank to use this command.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const removedCount = clearWarns(targetUser.id);

    try {
      const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
      const logEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        authorName: targetUser.tag,
        authorIcon: targetUser.displayAvatarURL(),
        title: '🧹 Warning History Cleared',
        description:
          `**User:** ${targetUser} (\`${targetUser.id}\`)\n` +
          `**Cleared by:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
          `**Warnings removed:** ${removedCount}`,
        fields: [{ name: 'Reason', value: reason }],
      });
      await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
      console.error('Failed to log clearwarns:', err);
    }

    await interaction.reply({ content: `Cleared ${removedCount} warning(s) for ${targetUser.tag}.`, ephemeral: true });
  },
};
