const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildAppealRow(type) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`appeal_start_${type}`).setLabel('Submit an Appeal').setEmoji('📨').setStyle(ButtonStyle.Primary)
  );
}

module.exports = { buildAppealRow };
