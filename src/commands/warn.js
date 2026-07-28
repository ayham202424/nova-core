const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { hasRank, getRank, RANKS } = require('../utils/permissions');
const { getWarnLevel } = require('../utils/warnLevels');
const { addWarn, getWarnCount } = require('../database/db');
const { baseEmbed } = require('../utils/embeds');
const { formatDuration } = require('../utils/duration');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member. Timeout duration escalates automatically with repeated warns.')
    .addUserOption((opt) => opt.setName('user').setDescription('The member to warn').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Why are you warning this user?').setRequired(true))
    .addAttachmentOption((opt) => opt.setName('proof').setDescription('Screenshot or file as proof').setRequired(false)),

  async execute(interaction) {
    const staffMember = interaction.member;
    if (!hasRank(staffMember, RANKS.TRIAL_STAFF)) {
      return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const proof = interaction.options.getAttachment('proof');

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ content: 'That user is not in the server.', ephemeral: true });
    }

    if (getRank(targetMember) >= getRank(staffMember) && staffMember.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot warn a staff member of equal or higher rank.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const newWarnCount = getWarnCount(targetUser.id) + 1;
    const level = getWarnLevel(newWarnCount);

    addWarn({
      userId: targetUser.id,
      moderatorId: staffMember.id,
      reason,
      proofUrl: proof ? proof.url : null,
      warnType: level.name,
      timeoutMinutes: level.timeoutMinutes,
    });

    let timeoutApplied = true;
    try {
      await targetMember.timeout(level.timeoutMinutes * 60 * 1000, `${level.name} — ${reason}`);
    } catch (err) {
      timeoutApplied = false;
      console.error('Failed to apply timeout:', err);
    }

    let dmSent = true;
    try {
      const dmEmbed = baseEmbed(interaction.client, {
        color: level.color,
        title: `${level.emoji} ${level.name}`,
        description:
          `You have received a warning in **Nova-Creations**.\n\n` +
          `**Reason:** ${reason}\n` +
          `**Issued by:** ${staffMember.user.tag}\n` +
          `**Timeout duration:** ${formatDuration(level.timeoutMinutes)}\n` +
          `**Total warnings:** ${newWarnCount}\n` +
          (proof ? `**Proof:** [View](${proof.url})` : '**Proof:** None provided'),
      });
      await targetUser.send({ embeds: [dmEmbed] });
    } catch (err) {
      dmSent = false;
    }

    try {
      const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
      const logEmbed = baseEmbed(interaction.client, {
        color: level.color,
        authorName: targetUser.tag,
        authorIcon: targetUser.displayAvatarURL(),
        title: `${level.emoji} Warn Issued — ${level.name}`,
        description:
          `**User:** ${targetUser} (\`${targetUser.id}\`)\n` +
          `**Moderator:** ${staffMember.user} (\`${staffMember.id}\`)\n` +
          `**Timeout:** ${formatDuration(level.timeoutMinutes)} (${timeoutApplied ? 'applied ✅' : 'failed ❌'})\n` +
          `**Total warnings:** ${newWarnCount}\n` +
          `**DM sent:** ${dmSent ? 'Yes ✅' : 'No ❌'}`,
        fields: [{ name: 'Reason', value: reason }],
        image: proof ? proof.url : null,
      });
      await logChannel.send({ embeds: [logEmbed] });
    } catch (err) {
      console.error('Failed to log warn:', err);
    }

    const confirmEmbed = baseEmbed(interaction.client, {
      color: level.color,
      title: `${level.emoji} Warn Applied`,
      description:
        `${targetUser} has been warned (**${level.name}**, warning #${newWarnCount}).\n` +
        `Timeout: ${formatDuration(level.timeoutMinutes)}` +
        (timeoutApplied ? '' : ' — ⚠️ failed to apply (check role hierarchy)'),
    });
    await interaction.editReply({ embeds: [confirmEmbed] });
  },
};
