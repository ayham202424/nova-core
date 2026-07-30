const { SlashCommandBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { startAnnouncementFlow } = require('../handlers/announcementFlow');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Create a professional announcement (Owner/Manager only).')
    .addStringOption((opt) => opt.setName('title').setDescription('Announcement title').setRequired(true))
    .addStringOption((opt) => opt.setName('message').setDescription('Announcement content').setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('color')
        .setDescription('Color theme')
        .setRequired(true)
        .addChoices(
          { name: 'Blue', value: 'blue' },
          { name: 'Green', value: 'green' },
          { name: 'Red', value: 'red' },
          { name: 'Yellow', value: 'yellow' },
          { name: 'Purple', value: 'purple' }
        )
    )
    .addAttachmentOption((opt) => opt.setName('banner').setDescription('Banner image (shown large at the bottom)').setRequired(false))
    .addAttachmentOption((opt) => opt.setName('file').setDescription('Additional file attachment').setRequired(false)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.MANAGER)) {
      return interaction.reply({ content: 'Only the Owner and Managers can create announcements.', ephemeral: true });
    }
    await startAnnouncementFlow(interaction);
  },
};
