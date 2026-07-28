const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');

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
    if (message.author.bot) return; // allows the bot's own log messages through
    if (!PROTECTED_LOG_CHANNELS.includes(message.channelId)) return;

    const attemptedContent = message.content || '[no text content — attachment, image, or embed only]';
    const sourceChannelId = message.channelId;

    try {
      await message.delete();
    } catch (err) {
      console.error('Failed to delete message in protected log channel:', err);
    }

    let dmSent = true;
    try {
      const warnEmbed = new EmbedBuilder()
        .setColor(0xd94141)
        .setTitle('Message Removed — Read-Only Channel')
        .setDescription(
          `Your message in <#${sourceChannelId}> was automatically deleted.\n\n` +
            '**Reason:** Log channels are read-only for everyone, including staff and the owner. ' +
            'They exist purely as an automated record and cannot be used to send messages.'
        )
        .addFields({ name: 'Your message (proof)', value: attemptedContent.slice(0, 1000) })
        .setTimestamp();

      await message.author.send({ embeds: [warnEmbed] });
    } catch (err) {
      dmSent = false;
      console.log(`Could not DM ${message.author.tag} — their DMs are likely closed.`);
    }

    try {
      const logChannel = await message.client.channels.fetch(config.channels.messageLogs);
      const incidentEmbed = new EmbedBuilder()
        .setColor(0xd94141)
        .setTitle('Protected Channel — Write Attempt Blocked')
        .setDescription(
          `**User:** ${message.author.tag} (${message.author.id})\n` +
            `**Attempted channel:** <#${sourceChannelId}>\n` +
            '**Action:** Message deleted automatically\n' +
            `**User notified via DM:** ${dmSent ? 'Yes' : 'No (DMs closed)'}`
        )
        .addFields({ name: 'Message content', value: attemptedContent.slice(0, 1000) })
        .setTimestamp();

      await logChannel.send({ embeds: [incidentEmbed] });
    } catch (err) {
      console.error('Failed to send incident log to Message Logs channel:', err);
    }
  },
};
