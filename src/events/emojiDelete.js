const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildEmojiDelete,
  once: false,
  async execute(emoji) {
    try {
      const executor = await findExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
      const logChannel = await emoji.client.channels.fetch(config.channels.serverLogs);
      const embed = baseEmbed(emoji.client, {
        color: THEME.colors.danger,
        title: '🗑️ Emoji Removed',
        description: `**Emoji:** \`:${emoji.name}:\`\n**Removed by:** ${executor ? executor.tag : 'Unknown'}`,
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log emoji delete:', err);
    }
  },
};
