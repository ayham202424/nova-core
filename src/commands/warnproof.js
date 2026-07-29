const { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { hasRank, getRank, RANKS } = require('../utils/permissions');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Warn (use as proof)')
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.TRIAL_STAFF)) {
      return interaction.reply({ content: 'You do not have permission to do this.', ephemeral: true });
    }

    const targetMessage = interaction.targetMessage;
    const targetUser = targetMessage.author;

    if (targetUser.bot) {
      return interaction.reply({ content: 'You cannot warn a bot.', ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember && getRank(targetMember) >= getRank(interaction.member) && interaction.member.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot warn a staff member of equal or higher rank.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`ctxwarn_${targetUser.id}_${targetMessage.channelId}_${targetMessage.id}`)
      .setTitle(`Warn ${targetUser.username}`.slice(0, 45));

    const reasonInput = new TextInputBuilder()
      .setCustomId('ctx_reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(500);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
  },
};
