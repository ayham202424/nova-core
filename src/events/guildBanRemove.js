const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildBanRemove,
  once: false,
  async execute(ban) {
    try {
      const executor = await findExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
      if (executor && executor.id === ban.client.user.id) return; // already logged by /unban

      const logChannel = await ban.client.channels.fetch(config.channels.cmdsLogs);
      const embed = baseEmbed(ban.client, {
        color: THEME.colors.success,
        authorName: ban.user.tag,
        authorIcon: ban.user.displayAvatarURL(),
        title: '🕊️ Member Unbanned (External)',
        description:
          `**User:** ${ban.user} (\`${ban.user.id}\`)\n` +
          `**Unbanned by:** ${executor ? executor.tag : 'Unknown'}\n\n` +
          "_Not issued through \`/unban\` — done via Discord's native tools or another bot._",
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log external unban:', err);
    }
  },
};
