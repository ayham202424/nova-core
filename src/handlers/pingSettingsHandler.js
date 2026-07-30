const { PING_CATEGORIES } = require('../utils/pingCategories');

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
      await interaction.reply({ content: `${category.emoji} You will **no longer** be pinged for ${category.label}.`, ephemeral: true });
    } else {
      await interaction.member.roles.add(category.roleId);
      await interaction.reply({ content: `${category.emoji} You will **now** be pinged for ${category.label}.`, ephemeral: true });
    }
  } catch (err) {
    console.error('Failed to toggle ping role:', err);
    await interaction.reply({ content: 'Something went wrong updating your ping settings.', ephemeral: true });
  }
}

module.exports = { handleToggle };
