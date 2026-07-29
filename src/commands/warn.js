const { SlashCommandBuilder } = require('discord.js');
const { hasRank, getRank, RANKS } = require('../utils/permissions');
const { issueWarn } = require('../utils/autoWarn');
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

    const { level, streak, timeoutApplied } = await issueWarn({
      client: interaction.client,
      guild: interaction.guild,
      targetUser,
      moderatorLabel: staffMember.user.tag,
      moderatorId: staffMember.id,
      reason,
      proofUrl: proof ? proof.url : null,
    });

    const confirmEmbed = baseEmbed(interaction.client, {
      color: level.color,
      title: `${level.emoji} Warn Applied`,
      description:
        `${targetUser} has been warned (**${level.name}**, streak #${streak}).\n` +
        `Timeout: ${formatDuration(level.timeoutMinutes)}` +
        (timeoutApplied ? '' : ' — ⚠️ failed to apply (check role hierarchy)'),
    });
    await interaction.editReply({ embeds: [confirmEmbed] });
  },
};
