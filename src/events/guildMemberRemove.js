const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member) {
    let kickedBy = null;
    try {
      kickedBy = await findExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
    } catch (err) {
      console.error('Failed to check kick audit log:', err);
    }

    try {
      const userLogsChannel = await member.client.channels.fetch(config.channels.userLogs);
      const roles = member.roles?.cache
        ? member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => r.toString()).join(', ') || 'None'
        : 'Unknown';
      const joinedTimestamp = member.joinedTimestamp
        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`
        : 'Unknown';

      const embed = baseEmbed(member.client, {
        color: THEME.colors.danger,
        authorName: member.user.tag,
        authorIcon: member.user.displayAvatarURL(),
        title: kickedBy ? '👢 Member Kicked' : '📤 Member Left',
        description: kickedBy
          ? `${member.user.tag} was kicked from the server.`
          : `${member.user.tag} left the server.`,
        fields: [
          { name: 'User ID', value: `\`${member.id}\`` },
          { name: 'Joined Server', value: joinedTimestamp },
          { name: 'Roles Had', value: roles },
        ],
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`staff_dm_open_${member.id}`)
          .setLabel('Send DM')
          .setEmoji('✉️')
          .setStyle(ButtonStyle.Secondary)
      );

      await userLogsChannel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Failed to send leave log:', err);
    }

    if (kickedBy && kickedBy.id !== member.client.user.id) {
      try {
        const cmdsLogChannel = await member.client.channels.fetch(config.channels.cmdsLogs);
        const embed = baseEmbed(member.client, {
          color: THEME.colors.danger,
          authorName: member.user.tag,
          authorIcon: member.user.displayAvatarURL(),
          title: '👢 Member Kicked (External)',
          description:
            `**User:** ${member.user} (\`${member.id}\`)\n**Kicked by:** ${kickedBy.tag}\n\n` +
            "_Not issued through \`/kick\` — done via Discord's native tools or another bot._",
        });
        await cmdsLogChannel.send({ embeds: [embed] });
      } catch (err) {
        console.error('Failed to log external kick:', err);
      }
    }
  },
};
