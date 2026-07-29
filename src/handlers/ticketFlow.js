const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');
const config = require('../config');
const { hasRank, RANKS } = require('../utils/permissions');
const { THEME, baseEmbed } = require('../utils/embeds');
const {
  createTicket,
  setTicketChannel,
  getOpenTicketByBuyer,
  getTicketByChannel,
  claimTicket,
  closeTicket,
  cancelTicket,
} = require('../database/db');
const { CATEGORY_INFO } = require('./listingHandler');

const pendingUsername = new Map();
const pendingDeletion = new Map();

function cleanupPending() {
  const now = Date.now();
  for (const [key, val] of pendingUsername.entries()) {
    if (now - val.timestamp > 5 * 60 * 1000) pendingUsername.delete(key);
  }
}

const staffRoleIds = () =>
  [config.roles.trialStaff, config.roles.staff, config.roles.mod, config.roles.headMod, config.roles.manager].filter(Boolean);

async function handleInterestedClick(interaction) {
  cleanupPending();
  const itemChannelId = interaction.customId.replace('market_interested_', '');

  const existing = getOpenTicketByBuyer(interaction.user.id);
  if (existing) {
    return interaction.reply({
      content: `You already have an open ticket: <#${existing.channel_id}>. Please finish or cancel it before opening another.`,
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder().setCustomId(`market_username_modal_${itemChannelId}`).setTitle('Purchase Inquiry');
  const usernameInput = new TextInputBuilder()
    .setCustomId('roblox_username')
    .setLabel('Your Roblox Username')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));
  await interaction.showModal(modal);
}

async function handleUsernameModalSubmit(interaction) {
  const itemChannelId = interaction.customId.replace('market_username_modal_', '');
  const robloxUsername = interaction.fields.getTextInputValue('roblox_username');

  pendingUsername.set(interaction.user.id, { robloxUsername, itemChannelId, timestamp: Date.now() });

  const menu = new StringSelectMenuBuilder()
    .setCustomId('market_payment_select')
    .setPlaceholder('Select your payment method')
    .addOptions(
      { label: 'Robux Transfer', value: 'Robux Transfer', emoji: '🟢' },
      { label: 'Gamepass / Dev Product', value: 'Gamepass / Dev Product', emoji: '🎮' },
      { label: 'Giftcard', value: 'Giftcard', emoji: '🎁' },
      { label: 'Other', value: 'Other', emoji: '❓' }
    );

  const row = new ActionRowBuilder().addComponents(menu);
  await interaction.reply({ content: 'How would you like to pay?', components: [row], ephemeral: true });
}

async function handlePaymentSelect(interaction) {
  const pending = pendingUsername.get(interaction.user.id);
  if (!pending) {
    return interaction.update({ content: 'This session expired — please click "I\'m Interested" again.', components: [] });
  }
  pendingUsername.delete(interaction.user.id);

  const paymentMethod = interaction.values[0];
  const info = CATEGORY_INFO[pending.itemChannelId] || { label: 'Item', emoji: '🛒' };
  const guild = interaction.guild;

  const ticketId = createTicket({
    buyerId: interaction.user.id,
    itemType: info.label,
    robloxUsername: pending.robloxUsername,
    paymentMethod,
  });

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
      deny: [PermissionsBitField.Flags.SendMessages],
    },
  ];
  for (const roleId of staffRoleIds()) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`.slice(0, 90),
    type: ChannelType.GuildText,
    parent: config.channels.ticketsCategory,
    permissionOverwrites: overwrites,
  });

  setTicketChannel(ticketId, channel.id);

  const summaryEmbed = baseEmbed(interaction.client, {
    color: THEME.colors.warning,
    authorName: interaction.user.tag,
    authorIcon: interaction.user.displayAvatarURL(),
    title: `${info.emoji} New Purchase Ticket`,
    description: 'Please wait — a staff member needs to **claim** this ticket before you can chat.',
    fields: [
      { name: 'Item Category', value: info.label, inline: true },
      { name: 'Roblox Username', value: pending.robloxUsername, inline: true },
      { name: 'Payment Method', value: paymentMethod, inline: true },
      { name: 'Status', value: '🟡 Waiting to be claimed' },
    ],
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`market_claim_${ticketId}`).setLabel('Claim Ticket').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`market_cancel_${ticketId}`).setLabel('Cancel Ticket').setEmoji('✖️').setStyle(ButtonStyle.Danger)
  );

  const pingRoleIds = [config.roles.staff, config.roles.mod, config.roles.manager].filter(Boolean);
  const pingContent = `${interaction.user} ${pingRoleIds.map((id) => `<@&${id}>`).join(' ')}`.trim();

  await channel.send({
    content: pingContent,
    embeds: [summaryEmbed],
    components: [row],
    allowedMentions: { users: [interaction.user.id], roles: pingRoleIds },
  });

  await interaction.update({ content: `Your ticket has been created: ${channel}`, components: [] });
}

async function handleClaim(interaction) {
  if (!hasRank(interaction.member, RANKS.TRIAL_STAFF)) {
    return interaction.reply({ content: 'You do not have permission to claim tickets.', ephemeral: true });
  }

  const ticket = getTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });
  if (ticket.status === 'claimed') {
    return interaction.reply({ content: 'This ticket is already claimed.', ephemeral: true });
  }

  claimTicket(interaction.channelId, interaction.user.id);

  try {
    await interaction.channel.permissionOverwrites.edit(ticket.buyer_id, { SendMessages: true });
  } catch (err) {
    console.error('Failed to unlock channel for buyer:', err);
  }

  const info = CATEGORY_INFO[Object.keys(CATEGORY_INFO).find((k) => CATEGORY_INFO[k].label === ticket.item_type)] || { emoji: '🛒' };

  const updatedEmbed = baseEmbed(interaction.client, {
    color: THEME.colors.success,
    title: `${info.emoji} Purchase Ticket — Claimed`,
    description: `Claimed by ${interaction.user}. You can now chat freely below.`,
    fields: [
      { name: 'Item Category', value: ticket.item_type, inline: true },
      { name: 'Roblox Username', value: ticket.roblox_username, inline: true },
      { name: 'Payment Method', value: ticket.payment_method, inline: true },
      { name: 'Status', value: `🟢 Claimed by ${interaction.user.tag}` },
    ],
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`market_close_${ticket.id}`).setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Secondary)
  );

  await interaction.update({ embeds: [updatedEmbed], components: [row] });
}

async function handleCancel(interaction) {
  const ticket = getTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });

  const isBuyer = interaction.user.id === ticket.buyer_id;
  const isStaff = hasRank(interaction.member, RANKS.TRIAL_STAFF);
  if (!isBuyer && !isStaff) {
    return interaction.reply({ content: 'You cannot cancel this ticket.', ephemeral: true });
  }

  const restoreRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`market_restore_${ticket.id}`).setLabel('Restore Ticket').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
  );

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.danger,
    title: 'Ticket Will Be Deleted',
    description: 'This ticket will be permanently deleted in **15 seconds**. Click Restore if this was a mistake.',
  });

  await interaction.update({ embeds: [embed], components: [restoreRow] });

  const timeoutHandle = setTimeout(async () => {
    if (pendingDeletion.get(ticket.channel_id) !== timeoutHandle) return;
    pendingDeletion.delete(ticket.channel_id);
    cancelTicket(ticket.channel_id);

    try {
      const logChannel = await interaction.client.channels.fetch(config.channels.ticketLogs);
      const logEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.danger,
        title: '✖️ Ticket Cancelled',
        description:
          `**Buyer:** <@${ticket.buyer_id}> (\`${ticket.buyer_id}\`)\n` +
          `**Item:** ${ticket.item_type}\n**Roblox Username:** ${ticket.roblox_username}\n**Payment:** ${ticket.payment_method}`,
      });
      await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
      console.error('Failed to log cancelled ticket:', err);
    }

    try {
      await interaction.channel.delete();
    } catch (err) {
      console.error('Failed to delete cancelled ticket channel:', err);
    }
  }, 15000);

  pendingDeletion.set(ticket.channel_id, timeoutHandle);
}

async function handleRestore(interaction) {
  const ticket = getTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });

  const handle = pendingDeletion.get(interaction.channelId);
  if (handle) {
    clearTimeout(handle);
    pendingDeletion.delete(interaction.channelId);
  }

  const info = CATEGORY_INFO[Object.keys(CATEGORY_INFO).find((k) => CATEGORY_INFO[k].label === ticket.item_type)] || { emoji: '🛒' };
  const isClaimed = ticket.status === 'claimed';

  const embed = baseEmbed(interaction.client, {
    color: isClaimed ? THEME.colors.success : THEME.colors.warning,
    title: `${info.emoji} Purchase Ticket — Restored`,
    description: isClaimed ? 'This ticket is claimed. You can chat freely below.' : 'Please wait — a staff member needs to claim this ticket.',
    fields: [
      { name: 'Item Category', value: ticket.item_type, inline: true },
      { name: 'Roblox Username', value: ticket.roblox_username, inline: true },
      { name: 'Payment Method', value: ticket.payment_method, inline: true },
      { name: 'Status', value: isClaimed ? `🟢 Claimed by <@${ticket.claimed_by}>` : '🟡 Waiting to be claimed' },
    ],
  });

  const row = isClaimed
    ? new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`market_close_${ticket.id}`).setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Secondary)
      )
    : new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`market_claim_${ticket.id}`).setLabel('Claim Ticket').setEmoji('✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`market_cancel_${ticket.id}`).setLabel('Cancel Ticket').setEmoji('✖️').setStyle(ButtonStyle.Danger)
      );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function handleClose(interaction) {
  if (!hasRank(interaction.member, RANKS.TRIAL_STAFF)) {
    return interaction.reply({ content: 'You do not have permission to close tickets.', ephemeral: true });
  }

  const ticket = getTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: 'Ticket data not found.', ephemeral: true });

  closeTicket(interaction.channelId, interaction.user.id, 'Completed by staff');

  try {
    const logChannel = await interaction.client.channels.fetch(config.channels.ticketLogs);
    const logEmbed = baseEmbed(interaction.client, {
      color: THEME.colors.success,
      title: '🔒 Ticket Closed',
      description:
        `**Buyer:** <@${ticket.buyer_id}> (\`${ticket.buyer_id}\`)\n` +
        `**Claimed by:** <@${ticket.claimed_by}>\n**Closed by:** ${interaction.user}\n` +
        `**Item:** ${ticket.item_type}\n**Roblox Username:** ${ticket.roblox_username}\n**Payment:** ${ticket.payment_method}`,
    });
    await logChannel.send({ embeds: [logEmbed] });
  } catch (err) {
    console.error('Failed to log closed ticket:', err);
  }

  await interaction.reply({ content: 'Closing ticket in 5 seconds...' });
  setTimeout(async () => {
    try {
      await interaction.channel.delete();
    } catch (err) {
      console.error('Failed to delete closed ticket channel:', err);
    }
  }, 5000);
}

module.exports = { handleInterestedClick, handleUsernameModalSubmit, handlePaymentSelect, handleClaim, handleCancel, handleRestore, handleClose };
