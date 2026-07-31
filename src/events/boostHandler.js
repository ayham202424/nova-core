const { Events } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember, newMember) {
    const wasBoosting = Boolean(oldMember.premiumSinceTimestamp);
    const isBoosting = Boolean(newMember.premiumSinceTimestamp);
    if (wasBoosting === isBoosting) return;
    if (!config.roles.vip) return;

    try {
      if (isBoosting) {
        await newMember.roles.add(config.roles.vip);
        const channel = await newMember.client.channels.fetch(config.channels.levelUp).catch(() => null);
        if (channel) {
          const embed = baseEmbed(newMember.client, {
            color: THEME.colors.success,
            authorName: newMember.user.tag,
            authorIcon: newMember.user.displayAvatarURL(),
            title: '💎 New Server Booster!',
            description: `${newMember} just boosted the server! They now have the VIP role and earn 1.5x XP.`,
          });
          await channel.send({ embeds: [embed] });
        }
      } else {
        await newMember.roles.remove(config.roles.vip);
      }
    } catch (err) {
      console.error('Failed to update VIP role on boost change:', err);
    }
  },
};
