const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildRoleUpdate,
  once: false,
  async execute(oldRole, newRole) {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (!changes.length) return;

    try {
      const executor = await findExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
      const logChannel = await newRole.client.channels.fetch(config.channels.serverLogs);
      const embed = baseEmbed(newRole.client, {
        color: THEME.colors.warning,
        title: '✏️ Role Updated',
        description: `**Role:** ${newRole}\n**Updated by:** ${executor ? executor.tag : 'Unknown'}\n\n${changes.join('\n')}`,
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log role update:', err);
    }
  },
};
