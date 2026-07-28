const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.ChannelUpdate,
  once: false,
  async execute(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`**Name:** ${oldChannel.name} → ${newChannel.name}`);
    if (oldChannel.topic !== newChannel.topic && (oldChannel.topic || newChannel.topic)) {
      changes.push(`**Topic changed**`);
    }
    if (!changes.length) return;

    try {
      const executor = await findExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
      const logChannel = await newChannel.client.channels.fetch(config.channels.serverLogs);
      const embed = baseEmbed(newChannel.client, {
        color: THEME.colors.warning,
        title: '✏️ Channel Updated',
        description: `**Channel:** ${newChannel}\n**Updated by:** ${executor ? executor.tag : 'Unknown'}\n\n${changes.join('\n')}`,
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log channel update:', err);
    }
  },
};
