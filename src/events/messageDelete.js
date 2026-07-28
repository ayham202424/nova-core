const { Events } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');

const PROTECTED_LOG_CHANNELS = [
  config.channels.messageLogs,
  config.channels.serverLogs,
  config.channels.cmdsLogs,
  config.channels.userLogs,
];

module.exports = {
  name: Events.MessageDelete,
  once: false,
  async execute(message) {
    if (!message.guild) return;
    if (PROTECTED_LOG_CHANNELS.includes(message.channelId)) return; // already handled separately
    if (message.author?.bot) return;

    try {
      const logChannel = await message.client.channels.fetch(config.channels.messageLogs);
      const content =
        message.content ||
        '*[content unavailable — message was sent before the bot started, or was an embed/attachment]*';

      const embed = baseEmbed(message.client, {
        color: THEME.colors.danger,
        authorName: message.author?.tag || 'Unknown User',
        authorIcon: message.author?.displayAvatarURL?.(),
        title: '🗑️ Message Deleted',
        description:
          `**Author:** ${message.author ?? 'Unknown'} (\`${message.author?.id ?? 'unknown'}\`)\n` +
          `**Channel:** <#${message.channelId}>`,
        fields: [{ name: 'Content', value: content.slice(0, 1000) }],
      });

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log deleted message:', err);
    }
  },
};
