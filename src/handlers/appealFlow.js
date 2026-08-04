const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { hasRank, RANKS } = require('../utils/permissions');
const { THEME, baseEmbed } = require('../utils/embeds');
const {
  getOrCreateUser,
  getWarns,
  createAppeal,
  setAppealMessage,
  getAppeal,
  getOpenAppealByUser,
  addAppealAttachment,
  getAppealAttachments,
  updateAppealStatus,
} = require('../database/db');
const { getThreatLevel } = require('../utils/threatLevel');

const pendingAttachmentWindows = new Map();

async function handleAppealStart(interaction) {
  const type = interaction.customId.replace('appeal_start_', '');

  const existing = getOpenAppealByUser(interaction.user.id);
  if (existing) {
    return interaction.reply({ content: `You already have a pending appeal (#${existing.id}). Please wait for it to be reviewed.`, ephemeral: true });
  }

  const modal = new ModalBuilder().setCustomId(`appeal_modal_${type}`).setTitle(type === 'ban' ? 'Ban Appeal' : 'Kick Report / Appeal');
  const reasonInput = new TextInputBuilder()
    .setCustomId('appeal_reason')
    .setLabel('Why should we reconsider?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);
  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

  await interaction.showModal(modal);
}

async function postAppealToChannel(client, appealId) {
  const appeal = getAppeal(appealId);
  const user = getOrCreateUser(appeal.user_id);
  const threat = getThreatLevel(appeal.user_id);
  const warns = getWarns(appeal.user_id).slice(0, 5);

  const embed = baseEmbed(client, {
    color: threat.emoji === '🔴' ? THEME.colors.danger : threat.emoji === '🟠' ? THEME.colors.warning : THEME.colors.primary,
    title: `📨 ${appeal.type === 'ban' ? 'Ban' : 'Kick'} Appeal #${appealId}`,
    description: `**User:** ${appeal.user_tag} (\`${appeal.user_id}\`)\n**Status:** ${threat.emoji} ${threat.label}`,
    fields: [
      { name: 'Reason Given', value: appeal.reason },
      { name: 'Total Warnings', value: `${user.warns_count || 0}`, inline: true },
      { name: 'Times Kicked', value: `${user.kicks_count || 0}`, inline: true },
      { name: 'Times Banned', value: `${user.bans_count || 0}`, inline: true },
      ...(warns.length ? [{ name: 'Recent Warnings', value: warns.map((w) => `${w.warn_type} — ${w.reason.slice(0, 80)}`).join('\n') }] : []),
    ],
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`appeal_accept_${appealId}`)
      .setLabel(appeal.type === 'ban' ? 'Accept & Unban' : 'Accept & Send Invite')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`appeal_reject_${appealId}`).setLabel('Reject').setEmoji('✖️').setStyle(ButtonStyle.Danger)
  );

  const channel = await client.channels.fetch(config.channels.banAppeals);
  const sent = await channel.send({ embeds: [embed], components: [row] });
  setAppealMessage(appealId, channel.id, sent.id);
}

async function handleAppealModalSubmit(interaction) {
  const type = interaction.customId.replace('appeal_modal_', '');
  const reason = interaction.fields.getTextInputValue('appeal_reason');

  const appealId = createAppeal({ userId: interaction.user.id, userTag: interaction.user.tag, type, reason });

  pendingAttachmentWindows.set(interaction.user.id, { appealId, expiresAt: Date.now() + 10 * 60 * 1000 });
  setTimeout(() => {
    const win = pendingAttachmentWindows.get(interaction.user.id);
    if (win && win.appealId === appealId) pendingAttachmentWindows.delete(interaction.user.id);
  }, 10 * 60 * 1000 + 5000);

  await postAppealToChannel(interaction.client, appealId);

  await interaction.reply({
    content:
      `Your appeal has been submitted (**#${appealId}**). A member of leadership will review it soon.\n\n` +
      `If you have proof or screenshots, send them here as a normal message within the next 10 minutes and I'll attach them automatically.`,
    ephemeral: true,
  });
}

async function handleIncomingAttachment(message) {
  const win = pendingAttachmentWindows.get(message.author.id);
  if (!win || Date.now() > win.expiresAt) return false;
  if (message.attachments.size === 0) return false;

  for (const attachment of message.attachments.values()) {
    addAppealAttachment(win.appealId, attachment.url, attachment.name);
  }

  try {
    const appeal = getAppeal(win.appealId);
    const channel = await message.client.channels.fetch(appeal.channel_id);
    const attachments = getAppealAttachments(win.appealId);
    const listText = attachments.map((a, i) => `[File ${i + 1}](${a.url})`).join('\n');

    const embed = baseEmbed(message.client, {
      color: THEME.colors.primary,
      title: `📎 Proof Added — Appeal #${win.appealId}`,
      description: listText,
    });
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('Failed to post appeal attachment:', err);
  }

  await message.reply("Got it — attached to your appeal.");
  return true;
}

async function handleAccept(interaction) {
  if (!hasRank(interaction.member, RANKS.HEAD_MOD)) {
    return interaction.reply({ content: 'You need at least Head Mod rank to review appeals.', ephemeral: true });
  }

  const appealId = parseInt(interaction.customId.replace('appeal_accept_', ''), 10);
  const appeal = getAppeal(appealId);
  if (!appeal) return interaction.reply({ content: 'Appeal not found.', ephemeral: true });
  if (appeal.status !== 'pending') return interaction.reply({ content: 'This appeal has already been reviewed.', ephemeral: true });

  updateAppealStatus(appealId, 'accepted', interaction.user.id, null);

  let dmSent = true;
  let extra = '';

  try {
    const targetUser = await interaction.client.users.fetch(appeal.user_id);

    if (appeal.type === 'ban') {
      await interaction.guild.bans.remove(appeal.user_id, `Appeal #${appealId} accepted by ${interaction.user.tag}`).catch(() => {});
      const dmEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        title: '✅ Your Ban Appeal Was Accepted',
        description: `You have been unbanned from **Nova-Creations**. You're welcome to rejoin.`,
      });
      await targetUser.send({ embeds: [dmEmbed] });
    } else {
      let inviteUrl = null;
      try {
        const verifyChannel = await interaction.client.channels.fetch(config.channels.verify);
        const invite = await verifyChannel.createInvite({ maxUses: 1, maxAge: 86400, unique: true });
        inviteUrl = `https://discord.gg/${invite.code}`;
        extra = `\nInvite sent: ${inviteUrl}`;
      } catch (err) {
        console.error('Failed to create rejoin invite:', err);
      }

      const dmEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        title: '✅ Your Appeal Was Accepted',
        description: inviteUrl ? `You're welcome to rejoin **Nova-Creations**: ${inviteUrl}` : `You're welcome to rejoin **Nova-Creations**.`,
      });
      await targetUser.send({ embeds: [dmEmbed] });
    }
  } catch (err) {
    dmSent = false;
    console.error('Failed to notify user of accepted appeal:', err);
  }

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.success,
    title: `✅ Appeal #${appealId} — Accepted`,
    description:
      `**Reviewed by:** ${interaction.user}\n**User notified:** ${dmSent ? 'Yes ✅' : 'No ❌'}${extra}` +
      (!dmSent && appeal.type === 'kick' ? `\n\n⚠️ Could not DM them the invite — share it manually if you have another way to reach them.` : ''),
  });

  await interaction.update({ embeds: [embed], components: [] });
}

async function handleReject(interaction) {
  if (!hasRank(interaction.member, RANKS.HEAD_MOD)) {
    return interaction.reply({ content: 'You need at least Head Mod rank to review appeals.', ephemeral: true });
  }

  const appealId = parseInt(interaction.customId.replace('appeal_reject_', ''), 10);
  const appeal = getAppeal(appealId);
  if (!appeal) return interaction.reply({ content: 'Appeal not found.', ephemeral: true });
  if (appeal.status !== 'pending') return interaction.reply({ content: 'This appeal has already been reviewed.', ephemeral: true });

  const modal = new ModalBuilder().setCustomId(`appeal_reject_modal_${appealId}`).setTitle('Reject Appeal');
  const input = new TextInputBuilder().setCustomId('reject_reason').setLabel('Reason for rejecting').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500);
  modal.addComponents(new ActionRowBuilder().addComponents(input));

  await interaction.showModal(modal);
}

async function handleRejectModalSubmit(interaction) {
  const appealId = parseInt(interaction.customId.replace('appeal_reject_modal_', ''), 10);
  const reason = interaction.fields.getTextInputValue('reject_reason');
  const appeal = getAppeal(appealId);

  updateAppealStatus(appealId, 'rejected', interaction.user.id, reason);

  let dmSent = true;
  try {
    const targetUser = await interaction.client.users.fetch(appeal.user_id);
    const dmEmbed = baseEmbed(interaction.client, {
      color: THEME.colors.danger,
      title: '❌ Your Appeal Was Rejected',
      description: `**Reason:** ${reason}`,
    });
    await targetUser.send({ embeds: [dmEmbed] });
  } catch (err) {
    dmSent = false;
  }

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.danger,
    title: `❌ Appeal #${appealId} — Rejected`,
    description: `**Reviewed by:** ${interaction.user}\n**Reason:** ${reason}\n**User notified:** ${dmSent ? 'Yes ✅' : 'No ❌'}`,
  });

  await interaction.update({ embeds: [embed], components: [] });
}

module.exports = {
  handleAppealStart,
  handleAppealModalSubmit,
  handleIncomingAttachment,
  handleAccept,
  handleReject,
  handleRejectModalSubmit,
  postAppealToChannel,
};
