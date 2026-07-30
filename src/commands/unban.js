const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { hasRank, RANKS } = require('../utils/permissions');
const { baseEmbed, THEME } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their User ID.')
    .addStringOption((opt) => opt.setName('userid').setDescription('The User ID to unban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Why are you unbanning this user?').setRequired(true)),

  async execute(interaction) {
    const staffMember = interaction.member;
    if (!hasRank(staffMember, RANKS.HEAD_MOD)) {
      return interaction.reply({ content: 'You need at least Head Mod rank to use this command.', ephemeral: true });
    }

    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason');

    await interaction.deferReply({ ephemeral: true });

    let unbanned = true;
    try {
      await interaction.guild.bans.remove(userId, reason);
    } catch (err) {
      unbanned = false;
      console.error('Failed to unban:', err);
    }

    try {
      const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
      const logEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.success,
        title: unbanned ? '🕊️ Member Unbanned' : '⚠️ Unban Failed',
        description: `**User ID:** \`${userId}\`\n**Moderator:** ${staffMember.user} (\`${staffMember.id}\`)`,
        fields: [{ name: 'Reason', value: reason }],
      });
      await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
      console.error('Failed to log unban:', err);
    }

    if (!unbanned) {
      return interaction.editReply({ content: 'Failed to unban — check that the User ID is correct and actually banned.' });
    }

    await interaction.editReply({ content: `User \`${userId}\` has been unbanned.` });
  },
};
