const { SlashCommandBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { startGiveawayFlow } = require('../handlers/giveawayFlow');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create a giveaway (Manager+ only).')
    .addStringOption((opt) => opt.setName('title').setDescription('Giveaway title').setRequired(true))
    .addStringOption((opt) => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
    .addIntegerOption((opt) => opt.setName('duration_minutes').setDescription('How long the giveaway runs, in minutes').setRequired(true).setMinValue(1))
    .addIntegerOption((opt) => opt.setName('winner_count').setDescription('How many winners?').setRequired(true).setMinValue(1).setMaxValue(20))
    .addStringOption((opt) =>
      opt
        .setName('requirement')
        .setDescription('Entry requirement')
        .setRequired(true)
        .addChoices(
          { name: 'None — anyone can join', value: 'none' },
          { name: 'Minimum Level', value: 'level' },
          { name: 'Invite X People', value: 'invites' }
        )
    )
    .addIntegerOption((opt) => opt.setName('requirement_value').setDescription('Level or invite count needed (skip if requirement = None)').setRequired(false))
    .addAttachmentOption((opt) => opt.setName('banner').setDescription('Banner image (optional)').setRequired(false)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.MANAGER)) {
      return interaction.reply({ content: 'Only the Owner and Managers can create giveaways.', ephemeral: true });
    }
    await startGiveawayFlow(interaction);
  },
};
