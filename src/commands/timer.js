const { SlashCommandBuilder } = require('discord.js');
const { startTimer } = require('../handlers/timerFlow');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timer')
    .setDescription('Start a countdown timer visible to everyone.')
    .addIntegerOption((opt) => opt.setName('amount').setDescription('How many units?').setRequired(true).setMinValue(1))
    .addStringOption((opt) =>
      opt
        .setName('unit')
        .setDescription('Minutes, hours, days, or months')
        .setRequired(true)
        .addChoices(
          { name: 'Minutes', value: 'minutes' },
          { name: 'Hours', value: 'hours' },
          { name: 'Days', value: 'days' },
          { name: 'Months', value: 'months' }
        )
    )
    .addStringOption((opt) => opt.setName('title').setDescription('Optional title for the timer').setRequired(false)),

  async execute(interaction) {
    await startTimer(interaction);
  },
};
