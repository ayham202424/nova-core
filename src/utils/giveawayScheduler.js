const config = require('../config');
const { THEME, baseEmbed } = require('./embeds');
const { getGiveaway, getGiveawayEntries, endGiveaway, getActiveGiveaways } = require('../database/db');

function pickRandomWinners(entries, count) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function finalizeGiveaway(client, giveawayId) {
  const giveaway = getGiveaway(giveawayId);
  if (!giveaway || giveaway.status !== 'active') return;

  const entries = getGiveawayEntries(giveawayId).map((e) => e.user_id);
  const winners = pickRandomWinners(entries, giveaway.winner_count);

  endGiveaway(giveawayId);

  const embed = baseEmbed(client, {
    color: winners.length ? THEME.colors.success : THEME.colors.warning,
    title: `🎉 Giveaway Ended — ${giveaway.title}`,
    description: winners.length
      ? `**Prize:** ${giveaway.prize}\n**Winner(s):** ${winners.map((id) => `<@${id}>`).join(', ')}`
      : `**Prize:** ${giveaway.prize}\n\nNo valid entries — no winner could be selected.`,
  });

  try {
    const channel = await client.channels.fetch(giveaway.channel_id);
    try {
      const originalMessage = await channel.messages.fetch(giveaway.message_id);
      await originalMessage.edit({ embeds: [embed], components: [] });
    } catch (err) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Failed to update giveaway message:', err);
  }

  for (const winnerId of winners) {
    try {
      const winnerUser = await client.users.fetch(winnerId);
      const dmEmbed = baseEmbed(client, {
        color: THEME.colors.success,
        title: '🎉 You Won!',
        description: `Congratulations! You won **${giveaway.prize}** in the giveaway "${giveaway.title}". Contact staff to claim your prize.`,
      });
      await winnerUser.send({ embeds: [dmEmbed] });
    } catch (err) {
      // DMs closed
    }
  }
}

function startGiveawayScheduler(client) {
  setInterval(() => {
    const active = getActiveGiveaways();
    const now = Date.now();
    for (const giveaway of active) {
      if (new Date(giveaway.end_time).getTime() <= now) {
        finalizeGiveaway(client, giveaway.id).catch((err) => console.error('Failed to finalize giveaway:', err));
      }
    }
  }, 30 * 1000);
}

module.exports = { startGiveawayScheduler, finalizeGiveaway };
