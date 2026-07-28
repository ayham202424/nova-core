const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildRoleCreate,
  once: false,
  async execute(role) {
    try {
      const executor = await findExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
      const logChannel = await role.client.channels.fetch(config.channels.serverLogs);
      const embed = baseEmbed(role.client, {
        color: THEME.colors.success,
        title: '➕ Role Created',
        description: `**Role:** ${role} (\`${role.name}\`)\n**Created by:** ${executor ? executor.tag : 'Unknown'}`,
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log role create:', err);
    }
  },
};
