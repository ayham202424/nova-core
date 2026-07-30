const { SlashCommandBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { reopenTicketChannel } = require('../handlers/supportTicketFlow');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reopenticket')
    .setDescription('Reopen a closed support ticket by its ID (find the ID in support-ticket-logs).')
    .addIntegerOption((opt) => opt.setName('ticketid').setDescription('The ticket ID').setRequired(true)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.STAFF)) {
      return interaction.reply({ content: 'You need at least Staff rank to use this command.', ephemeral: true });
    }
    await interaction.deferReply({ ephemeral: true });
    const result = await reopenTicketChannel(interaction.client, interaction.guild, interaction.options.getInteger('ticketid'));
    if (result.error) return interaction.editReply({ content: result.error });
    if (result.alreadyOpen) return interaction.editReply({ content: `That ticket is already open: ${result.channel}` });
    await interaction.editReply({ content: `Ticket reopened: ${result.channel}` });
  },
};
