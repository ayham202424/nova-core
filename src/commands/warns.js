const { SlashCommandBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { getWarns } = require('../database/db');
const { isSmallWarn } = require('../utils/warnLevels');
const { baseEmbed, THEME } = require('../utils/embeds');
const { formatDuration } = require('../utils/duration');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warns')
    .setDescription("View a member's warning history.")
    .addUserOption((opt) => opt.setName('user').setDescription('The member to check').setRequired(true)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.TRIAL_STAFF)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const warns = getWarns(targetUser.id);

    if (warns.length === 0) {
      const embed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        title: 'Clean Record',
        description: `${targetUser} has no warnings.`,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const smallCount = warns.filter((w) => isSmallWarn(w.warn_type)).length;
    const bigCount = warns.length - smallCount;

    const fields = warns.slice(0, 10).map((w) => ({
      name: `Warn ID: ${w.id} — ${w.warn_type}`,
      value:
        `**Reason:** ${w.reason}\n` +
        `**Moderator:** <@${w.moderator_id}>\n` +
        `**Timeout:** ${formatDuration(w.timeout_minutes)}\n` +
        `**Date:** <t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:F>` +
        (w.proof_url ? `\n**Proof:** [View](${w.proof_url})` : ''),
    }));

    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.warning,
      authorName: targetUser.tag,
      authorIcon: targetUser.displayAvatarURL(),
      title: `Warning History — ${warns.length} total`,
      description:
        `**Minor warnings:** ${smallCount}  ·  **Major warnings:** ${bigCount}\n` +
        'Use `/unwarn user:<name>` to remove a specific warning from the dropdown.\n' +
        (warns.length > 10 ? `_Showing the 10 most recent of ${warns.length}._` : ''),
      fields,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
