const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  async openModal(interaction) {
    if (
      !interaction.member.permissions.has('ManageMessages') &&
      !interaction.member.permissions.has('Administrator')
    ) {
      return interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });
    }

    const targetUserId = interaction.customId.replace('staff_dm_open_', '');

    const modal = new ModalBuilder()
      .setCustomId(`staff_dm_modal_${targetUserId}`)
      .setTitle('Send a Direct Message');

    const input = new TextInputBuilder()
      .setCustomId('staff_dm_content')
      .setLabel('Message to send')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Hey, we noticed you left Nova-Creations — is everything okay?')
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
  },

  async submitModal(interaction) {
    const targetUserId = interaction.customId.replace('staff_dm_modal_', '');
    const content = interaction.fields.getTextInputValue('staff_dm_content');

    try {
      const targetUser = await interaction.client.users.fetch(targetUserId);

      const dmEmbed = baseEmbed(interaction.client, {
        color: THEME.colors.primary,
        authorName: 'Nova-Creations Staff',
        title: 'Message from Nova-Creations',
        description: content,
      });

      await targetUser.send({ embeds: [dmEmbed] });
      await interaction.reply({ content: `Message sent to ${targetUser.tag}.`, ephemeral: true });
    } catch (err) {
      console.error('Failed to send staff DM:', err);
      await interaction.reply({
        content: 'Failed to send the message — this user may have DMs closed or has blocked the bot.',
        ephemeral: true,
      });
    }
  },
};
