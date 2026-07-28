const { EmbedBuilder } = require('discord.js');

const THEME = {
  colors: {
    primary: 0x2b2a55,
    success: 0x3ddc97,
    danger: 0xe63950,
    warning: 0xf5c451,
  },
  footerText: 'Nova-Creations  ✧  Reach for the stars',
};

function baseEmbed(client, options = {}) {
  const {
    color = THEME.colors.primary,
    title,
    description,
    fields,
    thumbnail,
    image,
    authorName,
    authorIcon,
  } = options;

  const embed = new EmbedBuilder().setColor(color).setTimestamp();

  if (authorName) embed.setAuthor({ name: authorName, iconURL: authorIcon || undefined });
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields && fields.length) embed.addFields(fields);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  embed.setFooter({
    text: THEME.footerText,
    iconURL: client?.user?.displayAvatarURL?.() || undefined,
  });

  return embed;
}

module.exports = { THEME, baseEmbed };
