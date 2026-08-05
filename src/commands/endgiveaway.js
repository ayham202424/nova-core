const { SlashCommandBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { getGiveaway } = require('../database/db');
const { finalizeGiveaway } = require('../utils/giveawayScheduler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('endgiveaway')
    .setDescription('End a giveaway early and pick winners now (Manager+ only).')
    .addIntegerOption((opt) => opt.setName('giveawayid').setDescription('The giveaway ID').setRequired(true)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.MANAGER)) {
      return interaction.reply({ content: 'Only the Owner and Managers can end giveaways early.', ephemeral: true });
    }

    const giveawayId = interaction.options.getInteger('giveawayid');
    const giveaway = getGiveaway(giveawayId);
    if (!giveaway) return interaction.reply({ content: 'No giveaway found with that ID.', ephemeral: true });
    if (giveaway.status !== 'active') return interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    await finalizeGiveaway(interaction.client, giveawayId);
    await interaction.editReply({ content: `Giveaway #${giveawayId} ended and winners have been announced.` });
  },
};
