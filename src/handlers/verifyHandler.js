const config = require('../config');
const { setVerified } = require('../database/db');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  async handleAccept(interaction) {
    const member = interaction.member;

    if (config.roles.member && member.roles.cache.has(config.roles.member)) {
      const embed = baseEmbed(interaction.client, {
        color: THEME.colors.warning,
        title: 'Already Verified',
        description: 'You already have access to the server.',
      });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    try {
      if (config.roles.unverified) await member.roles.remove(config.roles.unverified);
      if (config.roles.member) await member.roles.add(config.roles.member);

      setVerified(member.id, 1);

      const embed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        title: '🌙 Verified',
        description: `Welcome to **Nova-Creations**, ${member}. The stars have aligned — enjoy your stay.`,
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error(`Verification failed for ${member.user.tag}:`, err);
      const embed = baseEmbed(interaction.client, {
        color: THEME.colors.danger,
        title: 'Verification Failed',
        description: 'Something went wrong. Please contact staff for help.',
      });
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
