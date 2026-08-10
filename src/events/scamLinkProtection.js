const { Events } = require('discord.js');
const { getProtectedChannels } = require('../utils/protectedChannels');
const { checkScamLink } = require('../utils/scamLinkFilter');
const { issueWarn } = require('../utils/autoWarn');
const { THEME } = require('../utils/embeds');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (getProtectedChannels().includes(message.channelId)) return;

    const match = checkScamLink(message.content);
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
      moderatorLabel: 'Automated System (Scam Link Protection)',
      moderatorId: message.client.user.id,
      reason: `Posted a suspected scam/phishing link in <#${message.channelId}>: ${match}`,
      forcedLevel: { name: 'Scam/Phishing Link Detected', emoji: '🚨', timeoutMinutes: 420, color: THEME.colors.danger },
    });
  },
};
