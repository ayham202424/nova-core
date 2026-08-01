const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { THEME, baseEmbed } = require('../utils/embeds');
const { PING_CATEGORIES } = require('../utils/pingCategories');

function buildView(client, member) {
  const embed = baseEmbed(client, {
    color: THEME.colors.primary,
    title: '🔔 Your Ping Settings',
    description: '🟢 Green = active · ⚪ Grey = inactive. Click a button to toggle it.',
  });

  const row = new ActionRowBuilder().addComponents(
    PING_CATEGORIES.map((cat) => {
      const active = Boolean(cat.roleId && member.roles.cache.has(cat.roleId));
      return new ButtonBuilder()
        .setCustomId(`pingtoggle_${cat.key}`)
        .setLabel(`${cat.label}${active ? ' ✓' : ''}`)
        .setEmoji(cat.emoji)
        .setStyle(active ? ButtonStyle.Success : ButtonStyle.Secondary);
    })
  );

  return { embed, row };
}

async function handleOpenMenu(interaction) {
  const { embed, row } = buildView(interaction.client, interaction.member);
  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleToggle(interaction) {
  const key = interaction.customId.replace('pingtoggle_', '');
  const category = PING_CATEGORIES.find((c) => c.key === key);
  if (!category || !category.roleId) {
    return interaction.reply({ content: 'This ping category is not configured.', ephemeral: true });
  }

  const hasRole = interaction.member.roles.cache.has(category.roleId);
  try {
    if (hasRole) {
      await interaction.member.roles.remove(category.roleId);
    } else {
      await interaction.member.roles.add(category.roleId);
    }
  } catch (err) {
    console.error('Failed to toggle ping role:', err);
    return interaction.reply({ content: 'Something went wrong updating your ping settings.', ephemeral: true });
  }

  const refreshedMember = await interaction.guild.members.fetch(interaction.user.id);
  const { embed, row } = buildView(interaction.client, refreshedMember);
  await interaction.update({ embeds: [embed], components: [row] });
}

module.exports = { handleOpenMenu, handleToggle };
