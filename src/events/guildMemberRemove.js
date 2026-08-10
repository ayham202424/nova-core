const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { updateMemberCountChannel } = require('../utils/memberCountManager');
const { closeInviteRecord } = require('../database/db');

module.exports = {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member) {
    updateMemberCountChannel(member.client).catch((err) => console.error('Member count update failed:', err));
    closeInviteRecord(member.id);

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
        title: '📤 Member Left',
        description: `${member.user.tag} is no longer in the server (left, or was removed — check Cmds Logs for kick details).`,
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
  },
};
