const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildBanAdd,
  once: false,
  async execute(ban) {
    try {
      const executor = await findExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
      if (executor && executor.id === ban.client.user.id) return; // already logged by /ban

      const logChannel = await ban.client.channels.fetch(config.channels.cmdsLogs);
      const embed = baseEmbed(ban.client, {
        color: THEME.colors.danger,
        authorName: ban.user.tag,
        authorIcon: ban.user.displayAvatarURL(),
        title: '🔨 Member Banned (External)',
        description:
          `**User:** ${ban.user} (\`${ban.user.id}\`)\n` +
          `**Banned by:** ${executor ? executor.tag : 'Unknown'}\n` +
          `**Reason:** ${ban.reason || 'No reason provided'}\n\n` +
          "_Not issued through \`/ban\` — done via Discord's native tools or another bot._",
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log external ban:', err);
    }
  },
};
