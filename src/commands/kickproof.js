const { ContextMenuCommandBuilder, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { hasRank, getRank, RANKS } = require('../utils/permissions');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Kick (use as proof)')
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.STAFF)) {
      return interaction.reply({ content: 'You need at least Staff rank to do this.', ephemeral: true });
    }

    const targetMessage = interaction.targetMessage;
    const targetUser = targetMessage.author;

    if (targetUser.bot) {
      return interaction.reply({ content: 'You cannot kick a bot.', ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember && getRank(targetMember) >= getRank(interaction.member) && interaction.member.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: 'You cannot kick a staff member of equal or higher rank.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId(`ctxkick_${targetUser.id}_${targetMessage.channelId}_${targetMessage.id}`)
      .setTitle(`Kick ${targetUser.username}`.slice(0, 45));

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
