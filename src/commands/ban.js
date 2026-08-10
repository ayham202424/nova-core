const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { hasRank, getRank, RANKS } = require('../utils/permissions');
const { baseEmbed, THEME } = require('../utils/embeds');
const { checkForAbuse } = require('../utils/abuseDetection');
const { incrementBanCount } = require('../database/db');
const { buildAppealRow } = require('../utils/moderationDM');
const { getOwnerPingContent } = require('../utils/ownerPing');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .addUserOption((opt) => opt.setName('user').setDescription('The member to ban').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Why are you banning this user?').setRequired(true))
    .addAttachmentOption((opt) => opt.setName('proof').setDescription('Screenshot or file as proof').setRequired(false)),

  async execute(interaction) {
    const staffMember = interaction.member;
    if (!hasRank(staffMember, RANKS.HEAD_MOD)) {
      return interaction.reply({ content: 'You need at least Head Mod rank to use this command.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const proof = interaction.options.getAttachment('proof');

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember && getRank(targetMember) >= getRank(staffMember) && staffMember.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot ban a staff member of equal or higher rank.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    incrementBanCount(targetUser.id);

    let dmSent = true;
    try {
      const dmEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.danger,
        title: '🔨 You Have Been Banned',
        description:
          `You have been banned from **Nova-Creations**.\n\n**Reason:** ${reason}\n**Issued by:** ${staffMember.user.tag}\n` +
          (proof ? `**Proof:** [View](${proof.url})` : '**Proof:** None provided'),
      });
      await targetUser.send({ embeds: [dmEmbed], components: [buildAppealRow('ban')] });
    } catch (err) {
      dmSent = false;
    }

    let banned = true;
    try {
      await interaction.guild.bans.create(targetUser.id, { reason });
    } catch (err) {
      banned = false;
      console.error('Failed to ban member:', err);
    }

    try {
      const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
      const { content: ownerContent, ownerId } = await getOwnerPingContent(interaction.guild);
      const logEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.danger,
        authorName: targetUser.tag,
        authorIcon: targetUser.displayAvatarURL(),
        title: banned ? '🔨 Member Banned' : '⚠️ Ban Failed',
        description: `**User:** ${targetUser} (\`${targetUser.id}\`)\n**Moderator:** ${staffMember.user}\n**DM sent:** ${dmSent ? 'Yes ✅' : 'No ❌'}`,
        fields: [{ name: 'Reason', value: reason }],
        image: proof ? proof.url : null,
      });
      await logChannel.send({
        content: ownerContent || undefined,
        embeds: [logEmbed],
        allowedMentions: ownerId ? { users: [ownerId] } : undefined,
      });
    } catch (err) {
      console.error('Failed to log ban:', err);
    }

    if (banned) {
      await checkForAbuse(interaction.client, interaction.guild, staffMember, 'ban');
    } else {
      return interaction.editReply({ content: 'Failed to ban — check my role position and permissions.' });
    }

    const confirmEmbed = baseEmbed(interaction.client, {
      color: THEME.colors.danger,
      title: '🔨 Ban Applied',
      description: `${targetUser.tag} has been banned.`,
    });
    await interaction.editReply({ embeds: [confirmEmbed] });
  },
};
