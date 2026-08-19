const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');

const CATEGORY_INFO = {
  [config.channels.ui]: { label: 'UI', emoji: '🎨' },
  [config.channels.builds]: { label: 'Build', emoji: '🏗️' },
  [config.channels.scripts]: { label: 'Script / System', emoji: '⚙️' },
  [config.channels.animations]: { label: 'Animation', emoji: '🎬' },
};

const URL_REGEX = /https?:\/\/[^\s]+/gi;

async function urlToAttachment(url, name) {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  return new AttachmentBuilder(buffer, { name });
}

async function postFormattedListing(message) {
  const info = CATEGORY_INFO[message.channelId];
  if (!info) return;

  const rawAttachments = [...message.attachments.values()];
  const images = rawAttachments.filter((a) => a.contentType?.startsWith('image/'));
  const videos = rawAttachments.filter((a) => a.contentType?.startsWith('video/'));
  const others = rawAttachments.filter((a) => !a.contentType?.startsWith('image/') && !a.contentType?.startsWith('video/'));

  const rawContent = message.content?.trim() || '';
  const urlsInText = rawContent.match(URL_REGEX) || [];

  try {
    await message.delete();
  } catch (err) {
    console.error('Failed to delete original listing message:', err);
  }

  const embed = baseEmbed(message.client, {
    color: THEME.colors.primary,
    authorName: `${info.emoji} ${info.label} — For Sale`,
    authorIcon: message.guild.iconURL({ size: 128 }) || undefined,
    title: 'New Listing',
    description: rawContent || '*No description provided.*',
    image: images.length ? images[0].url : null,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`market_interested_${message.channelId}`)
      .setLabel("I'm Interested")
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Success)
  );

  const filesToAttach = [...images.slice(1), ...videos, ...others];
  const files = await Promise.all(filesToAttach.map((a) => urlToAttachment(a.url, a.name).catch(() => null)));
  const validFiles = files.filter(Boolean);

  // Post any plain links (YouTube, Streamable, etc.) as real message content
  // so Discord generates its own native video/link preview — this cannot happen
  // if the link only sits inside an embed's description.
  const linkContent = urlsInText.length ? urlsInText.join('\n') : undefined;

  await message.channel.send({ content: linkContent, embeds: [embed], components: [row], files: validFiles });
}

module.exports = { postFormattedListing, CATEGORY_INFO };
