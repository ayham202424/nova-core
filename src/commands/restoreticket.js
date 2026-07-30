const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { getSupportTicket, getTicketMessages } = require('../database/db');
const { SUPPORT_CATEGORIES } = require('../utils/supportCategories');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restoreticket')
    .setDescription('View the full transcript of a closed support ticket by its ID.')
    .addIntegerOption((opt) => opt.setName('ticketid').setDescription('The ticket ID (found in support-ticket-logs)').setRequired(true)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.STAFF)) {
      return interaction.reply({ content: 'You need at least Staff rank to use this command.', ephemeral: true });
    }

    const ticketId = interaction.options.getInteger('ticketid');
    const ticket = getSupportTicket(ticketId);
    if (!ticket) {
      return interaction.reply({ content: `No ticket found with ID \`${ticketId}\`.`, ephemeral: true });
    }

    const messages = getTicketMessages(ticketId);
    const category = SUPPORT_CATEGORIES[ticket.category];
    const answers = JSON.parse(ticket.answers);

    const lines = [
      `Ticket #${ticketId} — ${category.label}`,
      `Opener: ${ticket.opener_id}`,
      `Claimed by: ${ticket.claimed_by || 'never claimed'}`,
      `Status: ${ticket.status}`,
      `Created: ${ticket.created_at}`,
      '',
      '--- Initial Answers ---',
      ...category.fields.map((f) => `${f.label}: ${answers[f.id] || '(not answered)'}`),
      '',
      '--- Chat Transcript ---',
      ...(messages.length
        ? messages.map((m) => `[${m.timestamp}] ${m.author_tag} (${m.author_id}): ${m.content}`)
        : ['(no messages were sent in this ticket)']),
    ];

    const transcript = new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf-8'), {
      name: `ticket-${ticketId}-transcript.txt`,
    });

    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      title: `📄 Ticket #${ticketId} Restored`,
      description: `**Category:** ${category.label}\n**Status:** ${ticket.status}\n**Messages logged:** ${messages.length}`,
    });

    await interaction.reply({ embeds: [embed], files: [transcript], ephemeral: true });
  },
};
