const config = require('../config');
const { setVerified } = require('../database/db');

module.exports = {
  async handleAccept(interaction) {
    const member = interaction.member;

    if (config.roles.member && member.roles.cache.has(config.roles.member)) {
      return interaction.reply({
        content: 'You are already verified.',
        ephemeral: true,
      });
    }

    try {
      if (config.roles.unverified) await member.roles.remove(config.roles.unverified);
      if (config.roles.member) await member.roles.add(config.roles.member);

      setVerified(member.id, 1);

      await interaction.reply({
        content: 'You have been verified. Welcome to Nova-Creations!',
        ephemeral: true,
      });
    } catch (err) {
      console.error(`Verification failed for ${member.user.tag}:`, err);
      await interaction.reply({
        content: 'Verification failed. Please contact staff for help.',
        ephemeral: true,
      });
    }
  },
};
