const { Events } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const dmMenuHandler = require('../handlers/dmMenuHandler');

const PROTECTED_LOG_CHANNELS = [
  config.channels.messageLogs,
  config.channels.serverLogs,
  config.channels.cmdsLogs,
  config.channels.userLogs,
];

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot) return;

    if (!message.guild) {
      return dmMenuHandler.handleIncomingDM(message);
    }

    if (!PROTECTED_LOG_CHANNELS.includes(message.channelId)) return;

    const attemptedContent = message.content || '*[no text content — attachment, image, or embed only]*';
    const sourceChannelId = message.channelId;

    try {
      await message.delete();
    } catch (err) {
      console.error('Failed to delete message in protected log channel:', err);
    }

    let dmSent = true;
    try {
      const warnEmbed = baseEmbed(message.client, {
        color: THEME.colors.danger,
        title: '🌙 Message Removed — Read-Only Channel',
        description:
          `Your message in <#${sourceChannelId}> was automatically removed.\n\n` +
          '**Reason:** Log channels are read-only for everyone, including staff and the owner.',
        fields: [{ name: 'Your message (proof)', value: attemptedContent.slice(0, 1000) }],
      });
      await message.author.send({ embeds: [warnEmbed] });
    } catch (err) {
      dmSent = false;
    }

    try {
      const logChannel = await message.client.channels.fetch(config.channels.messageLogs);
      const incidentEmbed = baseEmbed(message.client, {
        color: THEME.colors.danger,
        authorName: message.author.tag,
        authorIcon: message.author.displayAvatarURL(),
        title: '⚠ Protected Channel — Write Attempt Blocked',
        description:
          `**User:** ${message.author} (\`${message.author.id}\`)\n` +
          `**Attempted channel:** <#${sourceChannelId}>\n` +
          '**Action taken:** Message deleted automatically\n' +
          `**User notified via DM:** ${dmSent ? 'Yes ✅' : 'No — DMs closed ❌'}`,
        fields: [{ name: 'Message content', value: attemptedContent.slice(0, 1000) }],
        thumbnail: message.author.displayAvatarURL(),
      });
      await logChannel.send({ embeds: [incidentEmbed] });
    } catch (err) {
      console.error('Failed to send incident log to Message Logs channel:', err);
    }
  },
};
