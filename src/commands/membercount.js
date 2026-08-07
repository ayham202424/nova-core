const { SlashCommandBuilder } = require('discord.js');
const { getBotState } = require('../database/db');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('membercount').setDescription('Shows the current and all-time peak member count.'),

  async execute(interaction) {
    const currentCount = interaction.guild.memberCount;
    const storedPeak = parseInt(getBotState('member_count_peak') || '0', 10);
    const peak = Math.max(currentCount, storedPeak);

    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      title: '👥 Nova-Creations Member Count',
      description: `**Current Members:** ${currentCount}\n**All-Time Peak:** ${peak}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
