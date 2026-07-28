const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildRoleDelete,
  once: false,
  async execute(role) {
    try {
      const executor = await findExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
      const logChannel = await role.client.channels.fetch(config.channels.serverLogs);
      const embed = baseEmbed(role.client, {
        color: THEME.colors.danger,
        title: '➖ Role Deleted',
        description: `**Role:** \`${role.name}\`\n**Deleted by:** ${executor ? executor.tag : 'Unknown'}`,
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log role delete:', err);
    }
  },
};
