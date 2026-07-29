const { Events } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { postFormattedListing, CATEGORY_INFO } = require('../handlers/listingHandler');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (!CATEGORY_INFO[message.channelId]) return;

    if (!hasRank(message.member, RANKS.MANAGER)) {
      try {
        await message.delete();
      } catch (err) {
        // ignore
      }
      try {
        const embed = baseEmbed(message.client, {
          color: THEME.colors.danger,
          title: 'Message Removed',
          description: `Only the Owner and Managers can post listings in <#${message.channelId}>.`,
        });
        await message.author.send({ embeds: [embed] });
      } catch (err) {
        // DMs closed
      }
      return;
    }

    await postFormattedListing(message);
  },
};
