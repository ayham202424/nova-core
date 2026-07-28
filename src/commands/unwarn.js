const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { getWarns } = require('../database/db');
const { baseEmbed, THEME } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription("Remove one of a member's warnings by picking it from a list.")
    .addUserOption((opt) => opt.setName('user').setDescription('The member to remove a warning from').setRequired(true)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.STAFF)) {
      return interaction.reply({ content: 'You need at least Staff rank to use this command.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const warns = getWarns(targetUser.id);

    if (warns.length === 0) {
      const embed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        title: 'Clean Record',
        description: `${targetUser} has no warnings to remove.`,
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const options = warns.slice(0, 25).map((w) => ({
      label: `${w.warn_type} — ${new Date(w.timestamp).toLocaleDateString()}`,
      description: w.reason.slice(0, 90),
      value: String(w.id),
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`unwarn_select_${targetUser.id}`)
      .setPlaceholder('Select a warning to remove')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.warning,
      authorName: targetUser.tag,
      authorIcon: targetUser.displayAvatarURL(),
      title: `Select a Warning to Remove (${warns.length} total)`,
      description: 'Pick one from the dropdown below.',
    });

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};
