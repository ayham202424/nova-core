const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { hasRank, getRank, RANKS } = require('../utils/permissions');
const { baseEmbed, THEME } = require('../utils/embeds');
const { checkForAbuse } = require('../utils/abuseDetection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption((opt) => opt.setName('user').setDescription('The member to kick').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Why are you kicking this user?').setRequired(true))
    .addAttachmentOption((opt) => opt.setName('proof').setDescription('Screenshot or file as proof').setRequired(false)),

  async execute(interaction) {
    const staffMember = interaction.member;
    if (!hasRank(staffMember, RANKS.STAFF)) {
      return interaction.reply({ content: 'You need at least Staff rank to use this command.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const proof = interaction.options.getAttachment('proof');

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ content: 'That user is not in the server.', ephemeral: true });
    }

    if (getRank(targetMember) >= getRank(staffMember) && staffMember.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot kick a staff member of equal or higher rank.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    let dmSent = true;
    try {
      const dmEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.danger,
        title: '👢 You Have Been Kicked',
        description:
          `You have been kicked from **Nova-Creations**.\n\n` +
          `**Reason:** ${reason}\n` +
          `**Issued by:** ${staffMember.user.tag}\n` +
          (proof ? `**Proof:** [View](${proof.url})` : '**Proof:** None provided') +
          `\n\nYou are welcome to rejoin and follow the rules going forward.`,
      });
      await targetUser.send({ embeds: [dmEmbed] });
    } catch (err) {
      dmSent = false;
    }

    let kicked = true;
    try {
      await targetMember.kick(reason);
    } catch (err) {
      kicked = false;
      console.error('Failed to kick member:', err);
    }

    try {
      const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
      const logEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.danger,
        authorName: targetUser.tag,
        authorIcon: targetUser.displayAvatarURL(),
        title: kicked ? '👢 Member Kicked' : '⚠️ Kick Failed',
        description:
          `**User:** ${targetUser} (\`${targetUser.id}\`)\n` +
          `**Moderator:** ${staffMember.user} (\`${staffMember.id}\`)\n` +
          `**DM sent:** ${dmSent ? 'Yes ✅' : 'No ❌'}`,
        fields: [{ name: 'Reason', value: reason }],
        image: proof ? proof.url : null,
      });
      await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
      console.error('Failed to log kick:', err);
    }

    if (kicked) {
      await checkForAbuse(interaction.client, interaction.guild, staffMember, 'kick');
    } else {
      return interaction.editReply({ content: 'Failed to kick — check that my role is above theirs.' });
    }

    const confirmEmbed = baseEmbed(interaction.client, {
      color: THEME.colors.danger,
      title: '👢 Kick Applied',
      description: `${targetUser.tag} has been kicked.`,
    });
    await interaction.editReply({ embeds: [confirmEmbed] });
  },
};
