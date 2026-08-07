const { Events } = require('discord.js');
const config = require('../config');
const { getProtectedChannels } = require('../utils/protectedChannels');
const { checkProfanity } = require('../utils/profanityFilter');
const { issueWarn } = require('../utils/autoWarn');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (getProtectedChannels().includes(message.channelId)) return;
    if (config.freeZoneChannelIds.includes(message.channelId)) return;

    const match = checkProfanity(message.content);
    if (!match) return;

    try {
      await message.delete();
    } catch (err) {
      // ignore
    }

    await issueWarn({
      client: message.client,
      guild: message.guild,
      targetUser: message.author,
      moderatorLabel: 'Automated System (Language Filter)',
      moderatorId: message.client.user.id,
      reason: `Used prohibited language in <#${message.channelId}>: "${message.content}"`,
    });
  },
};
