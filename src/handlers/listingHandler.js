const { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');

const CATEGORY_INFO = {
  [config.channels.ui]: { label: 'UI', emoji: '🎨' },
  [config.channels.builds]: { label: 'Build', emoji: '🏗️' },
  [config.channels.scripts]: { label: 'Script / System', emoji: '⚙️' },
  [config.channels.animations]: { label: 'Animation', emoji: '🎬' },
};

async function postFormattedListing(message) {
  const info = CATEGORY_INFO[message.channelId];
  if (!info) return;

  const attachments = [...message.attachments.values()];
  const images = attachments.filter((a) => a.contentType?.startsWith('image/'));
  const others = attachments.filter((a) => !a.contentType?.startsWith('image/'));
  const rawContent = message.content?.trim();

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

  const remainingFiles = [
    ...images.slice(1).map((a) => new AttachmentBuilder(a.url, { name: a.name })),
    ...others.map((a) => new AttachmentBuilder(a.url, { name: a.name })),
  ];

  await message.channel.send({ embeds: [embed], components: [row], files: remainingFiles });
}

module.exports = { postFormattedListing, CATEGORY_INFO };
