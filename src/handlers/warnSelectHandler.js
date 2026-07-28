const config = require('../config');
const { hasRank, RANKS } = require('../utils/permissions');
const { removeWarn } = require('../database/db');
const { baseEmbed, THEME } = require('../utils/embeds');

module.exports = {
  async handleUnwarnSelect(interaction) {
    if (!hasRank(interaction.member, RANKS.STAFF)) {
      return interaction.update({ content: 'You need at least Staff rank to do this.', embeds: [], components: [] });
    }

    const warnId = parseInt(interaction.values[0], 10);
    const removed = removeWarn(warnId);

    if (!removed) {
      return interaction.update({ content: 'That warning no longer exists (maybe already removed).', embeds: [], components: [] });
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
          `**Removed by:** ${interaction.user.tag}`,
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
          `**Affected user:** <@${removed.user_id}> (\`${removed.user_id}\`)\n` +
          `**Removed by:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
          `**User notified:** ${dmSent ? 'Yes ✅' : 'No ❌'}`,
        fields: [{ name: 'Original reason', value: removed.reason }],
      });
      await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
      console.error('Failed to log unwarn:', err);
    }

    const confirmEmbed = baseEmbed(interaction.client, {
      color: THEME.colors.success,
      title: '✅ Removed',
      description: `That warning (${removed.warn_type}) has been removed.`,
    });

    await interaction.update({ embeds: [confirmEmbed], components: [] });
  },
};
