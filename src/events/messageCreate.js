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

    try {
      await message.delete();
    } catch (err) {
      console.error('Failed to delete message in protected log channel:', err);
    }

    try {
      const warnEmbed = new EmbedBuilder()
        .setColor(0xd94141)
        .setTitle('Message Removed — Read-Only Channel')
        .setDescription(
          `Your message in <#${message.channelId}> was automatically deleted.\n\n` +
            '**Reason:** Log channels are read-only for everyone, including staff and the owner. ' +
            'They exist purely as an automated record and cannot be used to send messages.'
        )
        .addFields({ name: 'Your message (proof)', value: attemptedContent.slice(0, 1000) })
        .setTimestamp();

      await message.author.send({ embeds: [warnEmbed] });
    } catch (err) {
      console.log(`Could not DM ${message.author.tag} — their DMs are likely closed.`);
    }
  },
};
