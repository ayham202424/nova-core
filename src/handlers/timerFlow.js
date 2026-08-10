const { THEME, baseEmbed } = require('../utils/embeds');
const { createTimer, setTimerMessage, getActiveTimerByUser } = require('../database/db');

const UNIT_MS = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
  months: 30 * 24 * 60 * 60 * 1000,
};

function buildTimerEmbed(title, endTime, creatorTag, finished) {
  const remainingMs = new Date(endTime).getTime() - Date.now();
  return baseEmbed(null, {
    color: finished ? THEME.colors.success : THEME.colors.primary,
    title: finished ? `⏰ ${title || 'Timer'} — Finished!` : `⏳ ${title || 'Timer'}`,
    description: finished
      ? `Started by ${creatorTag}. Time's up!`
      : `Ends: <t:${Math.floor(new Date(endTime).getTime() / 1000)}:R> (<t:${Math.floor(new Date(endTime).getTime() / 1000)}:F>)\nStarted by ${creatorTag}`,
  });
}

async function startTimer(interaction) {
  const existing = getActiveTimerByUser(interaction.user.id);
  if (existing) {
    return interaction.reply({ content: `You already have an active timer running. Wait for it to finish before starting another.`, ephemeral: true });
  }

  const amount = interaction.options.getInteger('amount');
  const unit = interaction.options.getString('unit');
  const title = interaction.options.getString('title');

  const durationMs = amount * UNIT_MS[unit];
  const endTime = new Date(Date.now() + durationMs).toISOString();

  const timerId = createTimer({ userId: interaction.user.id, channelId: interaction.channelId, title, endTime });

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.primary,
    title: `⏳ ${title || 'Timer'}`,
    description: `Ends: <t:${Math.floor(new Date(endTime).getTime() / 1000)}:R> (<t:${Math.floor(new Date(endTime).getTime() / 1000)}:F>)\nStarted by ${interaction.user}`,
  });

  await interaction.reply({ embeds: [embed] });
  const sentMessage = await interaction.fetchReply();
  setTimerMessage(timerId, sentMessage.id);
}

module.exports = { startTimer, buildTimerEmbed, UNIT_MS };
