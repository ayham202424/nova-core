const { Events } = require('discord.js');
const config = require('../config');
const { getOrCreateUser } = require('../database/db');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    try {
      getOrCreateUser(member.id);
      if (config.roles.unverified) {
        await member.roles.add(config.roles.unverified);
      }
    } catch (err) {
      console.error(`Failed to assign Unverified role to ${member.user.tag}:`, err);
    }

    try {
      const userLogsChannel = await member.client.channels.fetch(config.channels.userLogs);
      const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);

      const embed = baseEmbed(member.client, {
        color: THEME.colors.success,
        authorName: member.user.tag,
        authorIcon: member.user.displayAvatarURL(),
        title: '📥 Member Joined',
        description: `${member} joined the server.`,
        fields: [
          {
            name: 'Account Created',
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (${accountAgeDays} days ago)`,
          },
          { name: 'User ID', value: `\`${member.id}\`` },
        ],
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
      });

      await userLogsChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to send join log:', err);
    }
  },
};
