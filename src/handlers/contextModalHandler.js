const config = require('../config');
const { hasRank, getRank, RANKS } = require('../utils/permissions');
const { issueWarn } = require('../utils/autoWarn');
const { baseEmbed, THEME } = require('../utils/embeds');
const { checkForAbuse } = require('../utils/abuseDetection');
const { formatDuration } = require('../utils/duration');

async function getProof(client, channelId, messageId) {
  try {
    const channel = await client.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);
    return { message, attachmentUrl: message.attachments.first()?.url || null };
  } catch (err) {
    return { message: null, attachmentUrl: null };
  }
}

module.exports = {
  async handleContextModal(interaction) {
    const [prefix, targetUserId, channelId, messageId] = interaction.customId.split('_');
    const reason = interaction.fields.getTextInputValue('ctx_reason');
    const staffMember = interaction.member;

    const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) return interaction.reply({ content: 'Could not find that user anymore.', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const { message, attachmentUrl } = await getProof(interaction.client, channelId, messageId);
    const proofNote = message
      ? `**Proof message:** [Jump to message](${message.url})` + (message.content ? `\n**Quoted content:** ${message.content.slice(0, 300)}` : '')
      : '**Proof:** Original message could not be fetched (may have been deleted).';
    const fullReason = `${reason}\n\n${proofNote}`;

    if (prefix === 'ctxwarn') {
      if (!hasRank(staffMember, RANKS.TRIAL_STAFF)) return interaction.editReply({ content: 'You do not have permission to do this.' });
      const { level, streak, timeoutApplied } = await issueWarn({
        client: interaction.client,
        guild: interaction.guild,
        targetUser,
        moderatorLabel: staffMember.user.tag,
        moderatorId: staffMember.id,
        reason: fullReason,
        proofUrl: attachmentUrl || (message ? message.url : null),
      });
      const confirmEmbed = baseEmbed(interaction.client, {
        color: level.color,
        title: `${level.emoji} Warn Applied`,
        description: `${targetUser} has been warned (**${level.name}**, streak #${streak}). Timeout: ${formatDuration(level.timeoutMinutes)}` + (timeoutApplied ? '' : ' — ⚠️ failed to apply'),
      });
      return interaction.editReply({ embeds: [confirmEmbed] });
    }

    if (prefix === 'ctxkick') {
      if (!hasRank(staffMember, RANKS.MOD)) return interaction.editReply({ content: 'You need at least Mod rank to do this.' });
      const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
      if (!targetMember) return interaction.editReply({ content: 'That user is not in the server.' });

      let dmSent = true;
      try {
        const dmEmbed = baseEmbed(interaction.client, {
          color: THEME.colors.danger,
          title: '👢 You Have Been Kicked',
          description: `You have been kicked from **Nova-Creations**.\n\n**Reason:** ${reason}\n**Issued by:** ${staffMember.user.tag}\n${proofNote}`,
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
      }

      try {
        const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
        await logChannel.send({
          embeds: [
            baseEmbed(interaction.client, {
              color: THEME.colors.danger,
              authorName: targetUser.tag,
              authorIcon: targetUser.displayAvatarURL(),
              title: kicked ? '👢 Member Kicked' : '⚠️ Kick Failed',
              description: `**User:** ${targetUser} (\`${targetUser.id}\`)\n**Moderator:** ${staffMember.user}\n**DM sent:** ${dmSent ? 'Yes ✅' : 'No ❌'}\n${proofNote}`,
              fields: [{ name: 'Reason', value: reason }],
              image: attachmentUrl || null,
            }),
          ],
        });
      } catch (err) {
        console.error(err);
      }

      if (kicked) await checkForAbuse(interaction.client, interaction.guild, staffMember, 'kick');
      return interaction.editReply({ content: kicked ? `${targetUser.tag} has been kicked.` : 'Failed to kick — check role hierarchy.' });
    }

    if (prefix === 'ctxban') {
      if (!hasRank(staffMember, RANKS.HEAD_MOD)) return interaction.editReply({ content: 'You need at least Head Mod rank to do this.' });

      let dmSent = true;
      try {
        const dmEmbed = baseEmbed(interaction.client, {
          color: THEME.colors.danger,
          title: '🔨 You Have Been Banned',
          description: `You have been banned from **Nova-Creations**.\n\n**Reason:** ${reason}\n**Issued by:** ${staffMember.user.tag}\n${proofNote}`,
        });
        await targetUser.send({ embeds: [dmEmbed] });
      } catch (err) {
        dmSent = false;
      }

      let banned = true;
      try {
        await interaction.guild.bans.create(targetUserId, { reason });
      } catch (err) {
        banned = false;
      }

      try {
        const logChannel = await interaction.client.channels.fetch(config.channels.cmdsLogs);
        await logChannel.send({
          embeds: [
            baseEmbed(interaction.client, {
              color: THEME.colors.danger,
              authorName: targetUser.tag,
              authorIcon: targetUser.displayAvatarURL(),
              title: banned ? '🔨 Member Banned' : '⚠️ Ban Failed',
              description: `**User:** ${targetUser} (\`${targetUser.id}\`)\n**Moderator:** ${staffMember.user}\n**DM sent:** ${dmSent ? 'Yes ✅' : 'No ❌'}\n${proofNote}`,
              fields: [{ name: 'Reason', value: reason }],
              image: attachmentUrl || null,
            }),
          ],
        });
      } catch (err) {
        console.error(err);
      }

      if (banned) await checkForAbuse(interaction.client, interaction.guild, staffMember, 'ban');
      return interaction.editReply({ content: banned ? `${targetUser.tag} has been banned.` : 'Failed to ban — check permissions.' });
    }
  },
};
