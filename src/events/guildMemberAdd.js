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

    let dmSent = true;
    try {
      const verifyChannelLink = `https://discord.com/channels/${member.guild.id}/${config.channels.verify}`;

      const welcomeEmbed = baseEmbed(member.client, {
        color: THEME.colors.primary,
        authorName: 'Nova-Creations',
        authorIcon: member.guild.iconURL({ size: 256 }) || undefined,
        title: '🌙 Welcome to Nova-Creations',
        description:
          `Hey ${member.user.username}, thanks for joining!\n\n` +
          'Before you can see and use the rest of the server, you need to **verify yourself**.\n\n' +
          `👉 Head over to **[the verification channel](${verifyChannelLink})** and click **Accept & Enter** ` +
          'after reading the rules.\n\n' +
          'This only takes a few seconds and unlocks the full server.',
      });

      await member.send({ embeds: [welcomeEmbed] });
    } catch (err) {
      dmSent = false;
      console.log(`Could not DM ${member.user.tag} on join — their DMs are likely closed.`);
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
          { name: 'Welcome DM Sent', value: dmSent ? 'Yes ✅' : 'No — DMs closed ❌' },
        ],
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
      });

      await userLogsChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to send join log:', err);
    }
  },
};
