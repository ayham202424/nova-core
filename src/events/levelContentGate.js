const { Events } = require('discord.js');
const { getProtectedChannels } = require('../utils/protectedChannels');
const { hasRank, RANKS } = require('../utils/permissions');
const { getOrCreateUser } = require('../database/db');
const { THEME, baseEmbed } = require('../utils/embeds');

const GIF_DOMAINS = ['tenor.com', 'giphy.com'];
const URL_REGEX = /https?:\/\/[^\s]+/i;

function classifyRequirement(message) {
  for (const attachment of message.attachments.values()) {
    const isGif = attachment.contentType === 'image/gif' || attachment.name?.toLowerCase().endsWith('.gif');
    if (!isGif) return { level: 10, type: 'file' };
  }

  const hasGifAttachment = [...message.attachments.values()].some(
    (a) => a.contentType === 'image/gif' || a.name?.toLowerCase().endsWith('.gif')
  );
  const hasGifEmbed = message.embeds.some((e) => e.type === 'gifv');
  const hasGifLink = GIF_DOMAINS.some((d) => message.content.includes(d));
  if (hasGifAttachment || hasGifEmbed || hasGifLink) return { level: 5, type: 'GIF' };

  if (URL_REGEX.test(message.content)) return { level: 3, type: 'link' };

  return null;
}

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (getProtectedChannels().includes(message.channelId)) return;
    if (message.member && hasRank(message.member, RANKS.TRIAL_STAFF)) return;

    const requirement = classifyRequirement(message);
    if (!requirement) return;

    const user = getOrCreateUser(message.author.id);
    if (user.level >= requirement.level) return;

    try {
      await message.delete();
    } catch (err) {
      // ignore
    }

    try {
      const embed = baseEmbed(message.client, {
        color: THEME.colors.warning,
        title: `🔒 Level ${requirement.level} Required`,
        description:
          `You need to be **Level ${requirement.level}** to send ${requirement.type}s. You're currently **Level ${user.level}**.\n\n` +
          'Keep chatting to earn XP and level up!',
      });
      await message.author.send({ embeds: [embed] });
    } catch (err) {
      // DMs closed
    }
  },
};
