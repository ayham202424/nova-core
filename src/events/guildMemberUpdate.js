const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember, newMember) {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const added = newRoles.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newRoles.has(r.id));
    if (!added.size && !removed.size) return;

    try {
      const executor = await findExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
      const logChannel = await newMember.client.channels.fetch(config.channels.serverLogs);

      const lines = [];
      if (added.size) lines.push(`**Added:** ${added.map((r) => r.toString()).join(', ')}`);
      if (removed.size) lines.push(`**Removed:** ${removed.map((r) => r.toString()).join(', ')}`);

      const embed = baseEmbed(newMember.client, {
        color: THEME.colors.warning,
        authorName: newMember.user.tag,
        authorIcon: newMember.user.displayAvatarURL(),
        title: '🎭 Member Roles Updated',
        description: `**Member:** ${newMember}\n**Changed by:** ${executor ? executor.tag : 'Unknown'}\n\n${lines.join('\n')}`,
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log member role update:', err);
    }
  },
};
