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

    if (added.size || removed.size) {
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
        console.error('Failed to log role update:', err);
      }
    }

    if (oldMember.nickname !== newMember.nickname) {
      try {
        const executor = await findExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        const logChannel = await newMember.client.channels.fetch(config.channels.serverLogs);
        const embed = baseEmbed(newMember.client, {
          color: THEME.colors.warning,
          authorName: newMember.user.tag,
          authorIcon: newMember.user.displayAvatarURL(),
          title: '📝 Nickname Changed',
          description:
            `**Member:** ${newMember}\n**Changed by:** ${executor ? executor.tag : 'Unknown (self)'}\n` +
            `**Before:** ${oldMember.nickname || '*none*'}\n**After:** ${newMember.nickname || '*none*'}`,
        });
        await logChannel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Failed to log nickname change:', err);
      }
    }

    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;
    if (oldTimeout !== newTimeout) {
      try {
        const executor = await findExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        if (executor && executor.id === newMember.client.user.id) return;

        const logChannel = await newMember.client.channels.fetch(config.channels.cmdsLogs);
        const isNowTimedOut = newTimeout && newTimeout > Date.now();
        const embed = baseEmbed(newMember.client, {
          color: isNowTimedOut ? THEME.colors.danger : THEME.colors.success,
          authorName: newMember.user.tag,
          authorIcon: newMember.user.displayAvatarURL(),
          title: isNowTimedOut ? '⏱️ Member Timed Out (External)' : '✅ Timeout Removed (External)',
          description:
            `**Member:** ${newMember} (\`${newMember.id}\`)\n**By:** ${executor ? executor.tag : 'Unknown'}` +
            (isNowTimedOut ? `\n**Expires:** <t:${Math.floor(newTimeout / 1000)}:F>` : ''),
        });
        await logChannel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Failed to log timeout change:', err);
      }
    }
  },
};
