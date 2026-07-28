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
  name: Events.MessageUpdate,
  once: false,
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild) return;
    if (PROTECTED_LOG_CHANNELS.includes(newMessage.channelId)) return;
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    try {
      const logChannel = await newMessage.client.channels.fetch(config.channels.messageLogs);
      const before = oldMessage.content || '*[unavailable — sent before bot started]*';
      const after = newMessage.content || '*[empty]*';

      const embed = baseEmbed(newMessage.client, {
        color: THEME.colors.warning,
        authorName: newMessage.author?.tag || 'Unknown User',
        authorIcon: newMessage.author?.displayAvatarURL?.(),
        title: '✏️ Message Edited',
        description:
          `**Author:** ${newMessage.author} (\`${newMessage.author?.id}\`)\n` +
          `**Channel:** <#${newMessage.channelId}> · [Jump to message](${newMessage.url})`,
        fields: [
          { name: 'Before', value: before.slice(0, 500) },
          { name: 'After', value: after.slice(0, 500) },
        ],
      });

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log edited message:', err);
    }
  },
};
