const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateUser, getWarns, getStaffStats } = require('../database/db');
const { hasRank, RANKS, getRank, RANK_NAMES } = require('../utils/permissions');
const { xpForNextLevel } = require('../utils/xpCurve');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription("View a member's stats: level, messages, warns, and more.")
    .addUserOption((opt) => opt.setName('user').setDescription('The member to check (defaults to yourself)').setRequired(false)),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;
    const canSeeFull = isSelf || hasRank(interaction.member, RANKS.TRIAL_STAFF);

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const user = getOrCreateUser(targetUser.id);
    const nextLevelXp = xpForNextLevel(user.level);
    const joinedText = targetMember?.joinedTimestamp ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Unknown';
    const highestRoleName = targetMember ? RANK_NAMES[getRank(targetMember)] || 'Member' : 'Unknown';

    const fields = [
      { name: 'Level', value: `${user.level} (${user.xp}/${nextLevelXp} XP)`, inline: true },
      { name: 'Messages Sent', value: `${user.messages_total}`, inline: true },
      { name: 'Joined Server', value: joinedText, inline: true },
      { name: 'Highest Role', value: highestRoleName, inline: true },
    ];

    if (canSeeFull) {
      fields.push({ name: 'Total Warnings', value: `${user.warns_count}`, inline: true });
      fields.push({ name: 'Tickets Opened', value: `${user.tickets_opened}`, inline: true });

      const warns = getWarns(targetUser.id).slice(0, 5);
      if (warns.length) {
        fields.push({
          name: `Recent Warnings (showing ${warns.length} of ${user.warns_count})`,
          value: warns.map((w) => `${w.warn_type} — ${w.reason.slice(0, 80)}`).join('\n'),
        });
      }
    }

    if (targetMember && hasRank(targetMember, RANKS.TRIAL_STAFF)) {
      const stats = getStaffStats(targetUser.id);
      fields.push({
        name: 'Staff Stats',
        value: `Tickets claimed: ${stats.ticketsClaimedCount}\nRating: ${
          stats.avgRating ? `⭐ ${stats.avgRating} (${stats.ratingCount} ratings)` : 'No ratings yet'
        }`,
      });
    }

    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      authorName: targetUser.tag,
      authorIcon: targetUser.displayAvatarURL(),
      title: `📋 User Info — ${targetUser.username}`,
      fields,
      thumbnail: targetUser.displayAvatarURL({ size: 128 }),
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
