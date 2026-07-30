const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  AttachmentBuilder,
} = require('discord.js');
const config = require('../config');
const { hasRank, RANKS, RANK_NAMES, getRank, allStaffRoleIds } = require('../utils/permissions');
const { THEME, baseEmbed } = require('../utils/embeds');
const { SUPPORT_CATEGORIES } = require('../utils/supportCategories');
const {
  createSupportTicket,
  setSupportTicketChannel,
  getOpenSupportTicketByUser,
  getSupportTicketByChannel,
  getSupportTicket,
  claimSupportTicket,
  completeSupportTicket,
  closeInvalidSupportTicket,
  cancelSupportTicket,
  reopenSupportTicket,
  getTicketMessages,
  getStaffStats,
} = require('../database/db');

const pendingRating = new Map();

function formatAnswers(category, answersObj) {
  const cat = SUPPORT_CATEGORIES[category];
  return cat.fields.map((f) => ({ name: f.label, value: answersObj[f.id] || '*Not answered*' }));
}

function reopenButtonRow(ticketId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`support_reopen_${ticketId}`).setLabel('Reopen (if closed)').setEmoji('🔓').setStyle(ButtonStyle.Secondary)
  );
}

async function handleOpenClick(interaction) {
  const key = interaction.customId.replace('support_open_', '');
  const category = SUPPORT_CATEGORIES[key];
  if (!category) return;

  if (category.staffOnly && !hasRank(interaction.member, RANKS.TRIAL_STAFF)) {
    return interaction.reply({ content: 'Only staff members can open this ticket type.', ephemeral: true });
  }

  const existing = getOpenSupportTicketByUser(interaction.user.id);
  if (existing) {
    return interaction.reply({ content: `You already have an open ticket: <#${existing.channel_id}>. Please wait for it to finish before opening another.`, ephemeral: true });
  }

  const modal = new ModalBuilder().setCustomId(`support_modal_${key}`).setTitle(category.label.slice(0, 45));
  modal.addComponents(
    category.fields.map((f) =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(f.id)
          .setLabel(f.label.slice(0, 45))
          .setStyle(f.style === 'Paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setMaxLength(f.maxLength)
          .setRequired(f.required)
      )
    )
  );

  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction) {
  const key = interaction.customId.replace('support_modal_', '');
  const category = SUPPORT_CATEGORIES[key];
  if (!category) return;

  await interaction.deferReply({ ephemeral: true });

  const answers = {};
  for (const f of category.fields) {
    try {
      answers[f.id] = interaction.fields.getTextInputValue(f.id);
    } catch (err) {
      answers[f.id] = '';
    }
  }

  const ticketId = createSupportTicket({ openerId: interaction.user.id, category: key, answers });
  const guild = interaction.guild;

  const roleIdsForCategory = category.staffOnly ? [config.roles.manager].filter(Boolean) : allStaffRoleIds();

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
      deny: [PermissionsBitField.Flags.SendMessages],
    },
  ];
  for (const roleId of roleIdsForCategory) {
    overwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
  }

  const channel = await guild.channels.create({
    name: `${category.prefix}-${interaction.user.username}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: config.channels.supportTicketsCategory,
    permissionOverwrites: overwrites,
  });

  setSupportTicketChannel(ticketId, channel.id);

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.warning,
    authorName: interaction.user.tag,
    authorIcon: interaction.user.displayAvatarURL(),
    title: `${category.emoji} ${category.label} — Ticket #${ticketId}`,
    description: 'Please wait — a staff member needs to **claim** this ticket before you can chat.',
    fields: [...formatAnswers(key, answers), { name: 'Status', value: '🟡 Waiting to be claimed' }],
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`support_claim_${ticketId}`).setLabel('Claim Ticket').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`support_cancel_${ticketId}`).setLabel('Cancel Ticket').setEmoji('✖️').setStyle(ButtonStyle.Danger)
  );

  const pingRoleIds = category.staffOnly ? [config.roles.manager].filter(Boolean) : [config.roles.staff, config.roles.mod, config.roles.manager].filter(Boolean);
  const pingContent = `${interaction.user} ${pingRoleIds.map((id) => `<@&${id}>`).join(' ')}`.trim();

  await channel.send({ content: pingContent, embeds: [embed], components: [row], allowedMentions: { users: [interaction.user.id], roles: pingRoleIds } });

  try {
    const logChannel = await interaction.client.channels.fetch(config.channels.supportTicketLogs);
    const logEmbed = baseEmbed(interaction.client, {
      color: THEME.colors.warning,
      authorName: interaction.user.tag,
      authorIcon: interaction.user.displayAvatarURL(),
      title: `🆕 ${category.emoji} Ticket #${ticketId} Opened — ${category.label}`,
      description: `**Opener:** ${interaction.user} (\`${interaction.user.id}\`)\n**Channel:** ${channel}`,
      fields: formatAnswers(key, answers),
    });
    await logChannel.send({ embeds: [logEmbed], components: [reopenButtonRow(ticketId)] });
  } catch (err) {
    console.error('Failed to send ticket-opened log:', err);
  }

  await interaction.editReply({ content: `Your ticket has been created: ${channel}` });
}

async function handleClaim(interaction) {
  if (!hasRank(interaction.member, RANKS.TRIAL_STAFF)) {
    return interaction.reply({ content: 'You do not have permission to claim tickets.', ephemeral: true });
  }

  const ticketId = parseInt(interaction.customId.replace('support_claim_', ''), 10);
  const ticket = getSupportTicket(ticketId);
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });
  if (ticket.status !== 'open') return interaction.reply({ content: 'This ticket is already claimed or closed.', ephemeral: true });

  const category = SUPPORT_CATEGORIES[ticket.category];
  if (category.staffOnly && !hasRank(interaction.member, RANKS.MANAGER)) {
    return interaction.reply({ content: 'Only a Manager or higher can claim this ticket type.', ephemeral: true });
  }

  claimSupportTicket(ticketId, interaction.user.id);

  try {
    await interaction.channel.permissionOverwrites.edit(ticket.opener_id, { SendMessages: true });
  } catch (err) {
    console.error('Failed to unlock channel for opener:', err);
  }

  const stats = getStaffStats(interaction.user.id);
  const answers = JSON.parse(ticket.answers);

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.success,
    authorName: interaction.user.tag,
    authorIcon: interaction.user.displayAvatarURL(),
    title: `${category.emoji} ${category.label} — Ticket #${ticketId} — Claimed`,
    description: `Claimed by ${interaction.user}. You can now chat freely below.`,
    fields: [
      ...formatAnswers(ticket.category, answers),
      {
        name: 'Claimed By',
        value: `${interaction.user} — ${RANK_NAMES[getRank(interaction.member)] || 'Staff'}\nTickets claimed: ${stats.ticketsClaimedCount}\nRating: ${
          stats.avgRating ? `⭐ ${stats.avgRating} (${stats.ratingCount} ratings)` : 'No ratings yet'
        }`,
      },
      ...(category.staffOnly ? [] : [{ name: 'Was this staff member unfair or made a mistake?', value: `Open an "Other" ticket via <#${config.channels.supportPanel}> to report it.` }]),
    ],
    thumbnail: interaction.user.displayAvatarURL({ size: 128 }),
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`support_complete_${ticketId}`).setLabel('Mark as Complete').setEmoji('🏁').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`support_closeinvalid_${ticketId}`).setLabel('Close (Invalid)').setEmoji('🗑️').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function handleCancel(interaction) {
  const ticketId = parseInt(interaction.customId.replace('support_cancel_', ''), 10);
  const ticket = getSupportTicket(ticketId);
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });

  const isOpener = interaction.user.id === ticket.opener_id;
  const isStaff = hasRank(interaction.member, RANKS.TRIAL_STAFF);
  if (!isOpener && !isStaff) return interaction.reply({ content: 'You cannot cancel this ticket.', ephemeral: true });

  cancelSupportTicket(ticketId);

  try {
    const logChannel = await interaction.client.channels.fetch(config.channels.supportTicketLogs);
    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.danger,
      title: `✖️ Ticket #${ticketId} — Cancelled`,
      description: `**Opener:** <@${ticket.opener_id}> (\`${ticket.opener_id}\`)\n**Category:** ${SUPPORT_CATEGORIES[ticket.category].label}`,
    });
    await logChannel.send({ embeds: [embed], components: [reopenButtonRow(ticketId)] });
  } catch (err) {
    console.error('Failed to log cancelled support ticket:', err);
  }

  await interaction.reply({ content: 'Cancelling ticket in 5 seconds...' });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

async function handleComplete(interaction) {
  const ticketId = parseInt(interaction.customId.replace('support_complete_', ''), 10);
  const ticket = getSupportTicket(ticketId);
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });

  const isClaimer = ticket.claimed_by === interaction.user.id;
  const isManager = hasRank(interaction.member, RANKS.MANAGER);
  if (!isClaimer && !isManager) {
    return interaction.reply({ content: 'Only the staff member who claimed this ticket (or a Manager) can complete it.', ephemeral: true });
  }

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.primary,
    title: 'How was your experience?',
    description: `Please rate the support you received, <@${ticket.opener_id}>. Click a star rating below.`,
  });

  const row = new ActionRowBuilder().addComponents(
    [1, 2, 3, 4, 5].map((n) => new ButtonBuilder().setCustomId(`support_rate_${n}_${ticketId}`).setLabel('⭐'.repeat(n)).setStyle(ButtonStyle.Secondary))
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleRate(interaction) {
  const [, , rating, ticketId] = interaction.customId.split('_');
  const ticket = getSupportTicket(parseInt(ticketId, 10));
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });

  if (interaction.user.id !== ticket.opener_id) {
    return interaction.reply({ content: 'Only the person who opened this ticket can rate it.', ephemeral: true });
  }

  pendingRating.set(interaction.user.id, { ticketId: parseInt(ticketId, 10), rating: parseInt(rating, 10) });

  const modal = new ModalBuilder().setCustomId(`support_feedback_modal_${ticketId}`).setTitle('Optional Feedback');
  const input = new TextInputBuilder().setCustomId('feedback_text').setLabel('Any comments? (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500);
  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
}

async function handleFeedbackSubmit(interaction) {
  const ticketId = parseInt(interaction.customId.replace('support_feedback_modal_', ''), 10);
  const pending = pendingRating.get(interaction.user.id);
  const rating = pending && pending.ticketId === ticketId ? pending.rating : null;
  pendingRating.delete(interaction.user.id);

  const feedback = interaction.fields.getTextInputValue('feedback_text');
  const ticket = getSupportTicket(ticketId);

  completeSupportTicket(ticketId, rating, feedback);

  try {
    const logChannel = await interaction.client.channels.fetch(config.channels.supportTicketLogs);
    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.success,
      title: `🏁 Ticket #${ticketId} — Completed`,
      description: `**Category:** ${SUPPORT_CATEGORIES[ticket.category].label}\n**Opener:** <@${ticket.opener_id}> (\`${ticket.opener_id}\`)\n**Claimed by:** <@${ticket.claimed_by}> (\`${ticket.claimed_by}\`)\n**Rating:** ${rating ? '⭐'.repeat(rating) : 'Not rated'}`,
      fields: feedback ? [{ name: 'Feedback', value: feedback }] : [],
    });
    await logChannel.send({ embeds: [embed], components: [reopenButtonRow(ticketId)] });
  } catch (err) {
    console.error('Failed to log completed support ticket:', err);
  }

  const thanksEmbed = baseEmbed(interaction.client, { color: THEME.colors.success, title: 'Thank You!', description: 'Thanks for your feedback — this ticket will close shortly.' });
  await interaction.reply({ embeds: [thanksEmbed] });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 8000);
}

async function handleCloseInvalid(interaction) {
  const ticketId = parseInt(interaction.customId.replace('support_closeinvalid_', ''), 10);
  const ticket = getSupportTicket(ticketId);
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });

  const isClaimer = ticket.claimed_by === interaction.user.id;
  const isManager = hasRank(interaction.member, RANKS.MANAGER);
  if (!isClaimer && !isManager) {
    return interaction.reply({ content: 'Only the claimer or a Manager can close this ticket as invalid.', ephemeral: true });
  }

  const modal = new ModalBuilder().setCustomId(`support_invalid_modal_${ticketId}`).setTitle('Reason for Closing');
  const input = new TextInputBuilder().setCustomId('invalid_reason').setLabel('Why is this ticket being closed as invalid?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(300);
  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
}

async function handleInvalidModalSubmit(interaction) {
  const ticketId = parseInt(interaction.customId.replace('support_invalid_modal_', ''), 10);
  const reason = interaction.fields.getTextInputValue('invalid_reason');
  const ticket = getSupportTicket(ticketId);

  closeInvalidSupportTicket(ticketId, reason);

  try {
    const logChannel = await interaction.client.channels.fetch(config.channels.supportTicketLogs);
    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.danger,
      title: `🗑️ Ticket #${ticketId} — Closed as Invalid`,
      description: `**Category:** ${SUPPORT_CATEGORIES[ticket.category].label}\n**Opener:** <@${ticket.opener_id}> (\`${ticket.opener_id}\`)\n**Closed by:** ${interaction.user} (\`${interaction.user.id}\`)`,
      fields: [{ name: 'Reason', value: reason }],
    });
    await logChannel.send({ embeds: [embed], components: [reopenButtonRow(ticketId)] });
  } catch (err) {
    console.error('Failed to log invalid support ticket:', err);
  }

  await interaction.reply({ content: 'Closing ticket in 5 seconds...' });
  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

async function reopenTicketChannel(client, guild, ticketId) {
  const ticket = getSupportTicket(ticketId);
  if (!ticket) return { error: `No ticket found with ID \`${ticketId}\`.` };

  if (ticket.channel_id) {
    const existingChannel = await client.channels.fetch(ticket.channel_id).catch(() => null);
    if (existingChannel) return { channel: existingChannel, alreadyOpen: true };
  }

  const category = SUPPORT_CATEGORIES[ticket.category];
  const answers = JSON.parse(ticket.answers);
  const messages = getTicketMessages(ticketId);

  const roleIdsForCategory = category.staffOnly ? [config.roles.manager].filter(Boolean) : allStaffRoleIds();
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    { id: ticket.opener_id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
  ];
  for (const roleId of roleIdsForCategory) {
    overwrites.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
  }

  const channel = await guild.channels.create({
    name: `${category.prefix}-${ticketId}-reopened`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: config.channels.supportTicketsCategory,
    permissionOverwrites: overwrites,
  });

  const transcriptText = [
    `Ticket #${ticketId} — ${category.label}`,
    `Original status: ${ticket.status}`,
    '',
    '--- Initial Answers ---',
    ...category.fields.map((f) => `${f.label}: ${answers[f.id] || '(not answered)'}`),
    '',
    '--- Past Chat Transcript ---',
    ...(messages.length ? messages.map((m) => `[${m.timestamp}] ${m.author_tag}: ${m.content}`) : ['(no messages were sent)']),
  ].join('\n');

  const transcriptFile = new AttachmentBuilder(Buffer.from(transcriptText, 'utf-8'), { name: `ticket-${ticketId}-history.txt` });

  const statusEmbed = baseEmbed(client, {
    color: THEME.colors.warning,
    title: `🔓 ${category.emoji} Ticket #${ticketId} — Reopened`,
    description: 'This ticket has been reopened. Past history is attached below as a file.',
    fields: [
      { name: 'Opener', value: `<@${ticket.opener_id}>` },
      { name: 'Previously claimed by', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'Never claimed' },
    ],
  });

  const row = ticket.claimed_by
    ? new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`support_complete_${ticketId}`).setLabel('Mark as Complete').setEmoji('🏁').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`support_closeinvalid_${ticketId}`).setLabel('Close (Invalid)').setEmoji('🗑️').setStyle(ButtonStyle.Secondary)
      )
    : new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`support_claim_${ticketId}`).setLabel('Claim Ticket').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`support_cancel_${ticketId}`).setLabel('Cancel Ticket').setEmoji('✖️').setStyle(ButtonStyle.Danger)
      );

  await channel.send({ content: `<@${ticket.opener_id}>`, embeds: [statusEmbed], files: [transcriptFile], components: [row] });

  reopenSupportTicket(ticketId, channel.id);

  return { channel, alreadyOpen: false };
}

async function handleReopenButton(interaction) {
  if (!hasRank(interaction.member, RANKS.STAFF)) {
    return interaction.reply({ content: 'You need at least Staff rank to reopen tickets.', ephemeral: true });
  }
  const ticketId = parseInt(interaction.customId.replace('support_reopen_', ''), 10);
  await interaction.deferReply({ ephemeral: true });
  const result = await reopenTicketChannel(interaction.client, interaction.guild, ticketId);
  if (result.error) return interaction.editReply({ content: result.error });
  if (result.alreadyOpen) return interaction.editReply({ content: `That ticket is already open: ${result.channel}` });
  await interaction.editReply({ content: `Ticket reopened: ${result.channel}` });
}

module.exports = {
  handleOpenClick,
  handleModalSubmit,
  handleClaim,
  handleCancel,
  handleComplete,
  handleRate,
  handleFeedbackSubmit,
  handleCloseInvalid,
  handleInvalidModalSubmit,
  handleReopenButton,
  reopenTicketChannel,
};
