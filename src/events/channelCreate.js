const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.ChannelCreate,
  once: false,
  async execute(channel) {
    if (!channel.guild) return;
    try {
      const executor = await findExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
      const logChannel = await channel.client.channels.fetch(config.channels.serverLogs);
      const embed = baseEmbed(channel.client, {
        color: THEME.colors.success,
        title: '➕ Channel Created',
        description: `**Channel:** ${channel} (\`${channel.name}\`)\n**Created by:** ${executor ? executor.tag : 'Unknown'}`,
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log channel create:', err);
    }
  },
};
