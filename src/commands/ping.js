const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Checks if Nova Core is online and responsive.'),

  async execute(interaction) {
    await interaction.reply({
      content: `Nova Core is online. Latency: ${Date.now() - interaction.createdTimestamp}ms`,
      ephemeral: true,
    });
  },
};
