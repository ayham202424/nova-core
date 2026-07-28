const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { hasRank, RANKS } = require('../utils/permissions');
const { removeWarn } = require('../database/db');
const { baseEmbed, THEME } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription("Remove a specific warning from a member's history.")
    .addIntegerOption((opt) => opt.setName('warnid').setDescription('The warning ID (see /warns)').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Why are you removing this warning?').setRequired(true)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.STAFF)) {
      return interaction.reply({ content: 'You need at least Staff rank to use this command.', ephemeral: true });
    }

    const warnId = interaction.options.getInteger('warnid');
    const reason = interaction.options.getString('reason');

    const removed = removeWarn(warnId);
    if (!removed) {
      return interaction.reply({ content: `No warning found with ID \`${warnId}\`.`, ephemeral: true });
    }

    let dmSent = true;
    try {
      const targetUser = await interaction.client.users.fetch(removed.user_id);
      const dmEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        title: '✅ A Warning Was Removed',
        description:
          `One of your warnings in **Nova-Creations** has been removed.\n\n` +
          `**Original reason:** ${removed.reason}\n` +
          `**Removed by:** ${interaction.user.tag}\n` +
          `**Removal reason:** ${reason}`,
      });
      await targetUser.send({ embeds: [dmEmbed] });
    } catch (err) {
      dmSent = false;
    }

    try {
      const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
      const logEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        title: '✅ Warning Removed',
        description:
          `**Warn ID:** \`${warnId}\`\n` +
          `**Affected user:** <@${removed.user_id}> (\`${removed.user_id}\`)\n` +
          `**Removed by:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
          `**User notified:** ${dmSent ? 'Yes ✅' : 'No ❌'}`,
        fields: [
          { name: 'Original reason', value: removed.reason },
          { name: 'Removal reason', value: reason },
        ],
      });
      await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
      console.error('Failed to log unwarn:', err);
    }

    await interaction.reply({ content: `Warning \`${warnId}\` has been removed.`, ephemeral: true });
  },
};
