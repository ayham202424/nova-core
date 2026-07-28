const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildEmojiCreate,
  once: false,
  async execute(emoji) {
    try {
      const executor = await findExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
      const logChannel = await emoji.client.channels.fetch(config.channels.serverLogs);
      const embed = baseEmbed(emoji.client, {
        color: THEME.colors.success,
        title: '😀 Emoji Added',
        description: `**Emoji:** \`:${emoji.name}:\`\n**Added by:** ${executor ? executor.tag : 'Unknown'}`,
        thumbnail: emoji.imageURL(),
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log emoji create:', err);
    }
  },
};
