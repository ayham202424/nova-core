const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  AttachmentBuilder,
} = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { PING_CATEGORIES } = require('../utils/pingCategories');

const COLOR_MAP = { blue: 0x3b82f6, green: 0x3ddc97, red: 0xe63950, yellow: 0xf5c451, purple: 0x8b5cf6 };
const pending = new Map();

function cleanup() {
  const now = Date.now();
  for (const [key, val] of pending.entries()) {
    if (now - val.timestamp > 10 * 60 * 1000) pending.delete(key);
  }
}

function buildComponents(data) {
  const channelRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId('announce_channel_select')
      .setPlaceholder(data.channelId ? 'Channel selected ✓' : 'Select a channel to post in')
      .setChannelTypes(ChannelType.GuildText)
  );

  const pingRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('announce_ping_select')
      .setPlaceholder(data.pingKeys.length ? `${data.pingKeys.length} ping role(s) selected ✓` : 'Select ping role(s) — optional')
      .setMinValues(0)
      .setMaxValues(PING_CATEGORIES.length)
      .addOptions(PING_CATEGORIES.map((c) => ({ label: c.label, value: c.key, emoji: c.emoji, default: data.pingKeys.includes(c.key) })))
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('announce_everyone_toggle')
      .setLabel(data.pingEveryone ? '🚨 Ping Everyone: ON' : '🚨 Ping Everyone (Override)')
      .setStyle(data.pingEveryone ? ButtonStyle.Danger : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('announce_send').setLabel('Send Announcement').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('announce_cancel').setLabel('Cancel').setEmoji('✖️').setStyle(ButtonStyle.Danger)
  );

  return [channelRow, pingRow, buttonRow];
}

function buildPreviewEmbed(client, data) {
  const channelText = data.channelId ? `<#${data.channelId}>` : '*not selected yet*';
  const pingText = data.pingEveryone
    ? '@everyone (override)'
    : data.pingKeys.length
    ? data.pingKeys.map((k) => PING_CATEGORIES.find((c) => c.key === k)?.label).join(', ')
    : '*none*';
  const attachmentsSummary =
    [data.bannerUrl ? 'Banner ✅' : null, data.videoUrl ? 'Video ✅' : null, data.fileUrl ? 'File ✅' : null].filter(Boolean).join(' · ') ||
    'None';

  return baseEmbed(client, {
    color: data.color,
    title: data.title,
    description: data.message,
    image: data.bannerUrl,
    fields: [
      { name: 'Target Channel', value: channelText, inline: true },
      { name: 'Ping', value: pingText, inline: true },
      { name: 'Attachments', value: attachmentsSummary, inline: true },
    ],
  });
}

async function startAnnouncementFlow(interaction) {
  cleanup();
  const title = interaction.options.getString('title');
  const message = interaction.options.getString('message');
  const colorKey = interaction.options.getString('color');
  const banner = interaction.options.getAttachment('banner');
  const video = interaction.options.getAttachment('video');
  const file = interaction.options.getAttachment('file');

  if (banner && !banner.contentType?.startsWith('image/')) {
    return interaction.reply({
      content:
        "The **banner** option only accepts images (PNG/JPG/GIF/WebP) because it renders inside the embed. " +
        "For videos, use the **video** option instead — it attaches as a real, playable file.",
      ephemeral: true,
    });
  }

  const data = {
    title,
    message,
    color: COLOR_MAP[colorKey] || COLOR_MAP.blue,
    bannerUrl: banner ? banner.url : null,
    videoUrl: video ? video.url : null,
    videoName: video ? video.name : null,
    fileUrl: file ? file.url : null,
    fileName: file ? file.name : null,
    channelId: null,
    pingKeys: [],
    pingEveryone: false,
    timestamp: Date.now(),
  };

  pending.set(interaction.user.id, data);

  await interaction.reply({
    content: 'Preview — configure the channel and ping settings below, then confirm.',
    embeds: [buildPreviewEmbed(interaction.client, data)],
    components: buildComponents(data),
    ephemeral: true,
  });
}

async function handleChannelSelect(interaction) {
  const data = pending.get(interaction.user.id);
  if (!data) return interaction.update({ content: 'This session expired — run `/announcement` again.', embeds: [], components: [] });
  data.channelId = interaction.values[0];
  await interaction.update({ embeds: [buildPreviewEmbed(interaction.client, data)], components: buildComponents(data) });
}

async function handlePingSelect(interaction) {
  const data = pending.get(interaction.user.id);
  if (!data) return interaction.update({ content: 'This session expired — run `/announcement` again.', embeds: [], components: [] });
  data.pingKeys = interaction.values;
  await interaction.update({ embeds: [buildPreviewEmbed(interaction.client, data)], components: buildComponents(data) });
}

async function handleEveryoneToggle(interaction) {
  const data = pending.get(interaction.user.id);
  if (!data) return interaction.update({ content: 'This session expired — run `/announcement` again.', embeds: [], components: [] });
  data.pingEveryone = !data.pingEveryone;
  await interaction.update({ embeds: [buildPreviewEmbed(interaction.client, data)], components: buildComponents(data) });
}

async function handleCancel(interaction) {
  pending.delete(interaction.user.id);
  await interaction.update({ content: 'Announcement cancelled.', embeds: [], components: [] });
}

async function handleSend(interaction) {
  const data = pending.get(interaction.user.id);
  if (!data) return interaction.update({ content: 'This session expired — run `/announcement` again.', embeds: [], components: [] });

  if (!data.channelId) {
    return interaction.reply({ content: 'Please select a target channel first.', ephemeral: true });
  }

  const targetChannel = await interaction.client.channels.fetch(data.channelId).catch(() => null);
  if (!targetChannel) {
    return interaction.reply({ content: 'Could not find that channel — it may have been deleted.', ephemeral: true });
  }

  let content = '';
  let allowedMentions = { parse: [] };
  if (data.pingEveryone) {
    content = '@everyone';
    allowedMentions = { parse: ['everyone'] };
  } else if (data.pingKeys.length) {
    const roleIds = data.pingKeys.map((k) => PING_CATEGORIES.find((c) => c.key === k)?.roleId).filter(Boolean);
    content = roleIds.map((id) => `<@&${id}>`).join(' ');
    allowedMentions = { roles: roleIds };
  }

  const finalEmbed = buildPreviewEmbed(interaction.client, data);
  finalEmbed.setFields();

  const files = [];
  if (data.videoUrl) files.push(new AttachmentBuilder(data.videoUrl, { name: data.videoName || 'video.mp4' }));
  if (data.fileUrl) files.push(new AttachmentBuilder(data.fileUrl, { name: data.fileName || 'attachment' }));

  await targetChannel.send({ content: content || undefined, embeds: [finalEmbed], files, allowedMentions });

  pending.delete(interaction.user.id);
  await interaction.update({ content: `Announcement sent to ${targetChannel}.`, embeds: [], components: [] });
}

module.exports = { startAnnouncementFlow, handleChannelSelect, handlePingSelect, handleEveryoneToggle, handleCancel, handleSend };
