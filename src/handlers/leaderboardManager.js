const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { getLevelLeaderboard, getMessageLeaderboard, getXpGainedLeaderboard, getBotState, setBotState } = require('../database/db');

const TIMEFRAME_LABELS = { today: 'Today', pastday: 'Past 24 Hours', pastweek: 'Past Week', alltime: 'All Time' };

function getCutoff(key) {
  const now = Date.now();
  if (key === 'today') {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (key === 'pastday') return now - 24 * 60 * 60 * 1000;
  if (key === 'pastweek') return now - 7 * 24 * 60 * 60 * 1000;
  return null;
}

async function buildLeaderboardEmbed(client, timeframeKey) {
  const cutoff = getCutoff(timeframeKey);
  const isAllTime = timeframeKey === 'alltime';

  let levelLines;
  if (isAllTime) {
    const board = getLevelLeaderboard(10);
    levelLines = board.length ? board.map((u, i) => `**#${i + 1}** <@${u.user_id}> — Level ${u.level} (${u.xp} XP)`).join('\n') : '*No data yet.*';
  } else {
    const board = getXpGainedLeaderboard(cutoff, 10);
    levelLines = board.length ? board.map((u, i) => `**#${i + 1}** <@${u.user_id}> — ${u.total} XP gained`).join('\n') : '*No XP gained in this period yet.*';
  }

  const messageBoard = getMessageLeaderboard(cutoff, 10);
  const messageLines = messageBoard.length
    ? messageBoard.map((u, i) => `**#${i + 1}** <@${u.user_id}> — ${u.total} messages`).join('\n')
    : '*No messages in this period yet.*';

  return baseEmbed(client, {
    color: THEME.colors.primary,
    title: `🏆 Nova-Creations Leaderboard — ${TIMEFRAME_LABELS[timeframeKey]}`,
    description: 'Updates automatically every few minutes, or instantly when you switch timeframes.',
    fields: [
      { name: isAllTime ? '⭐ Level Leaderboard' : '⭐ XP Gained', value: levelLines, inline: true },
      { name: '💬 Messages Sent', value: messageLines, inline: true },
    ],
  });
}

function buildButtonsRow(activeKey) {
  return new ActionRowBuilder().addComponents(
    Object.entries(TIMEFRAME_LABELS).map(([key, label]) =>
      new ButtonBuilder().setCustomId(`leaderboard_tf_${key}`).setLabel(label).setStyle(key === activeKey ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  );
}

async function refreshLeaderboard(client, timeframeKey) {
  const channel = await client.channels.fetch(config.channels.leaderboard).catch(() => null);
  if (!channel) return;

  const embed = await buildLeaderboardEmbed(client, timeframeKey);
  const row = buildButtonsRow(timeframeKey);

  const storedMessageId = getBotState('leaderboard_message_id');
  if (storedMessageId) {
    try {
      const message = await channel.messages.fetch(storedMessageId);
      await message.edit({ embeds: [embed], components: [row] });
      return;
    } catch (err) {
      // message gone — fall through and create a new one
    }
  }

  const sent = await channel.send({ embeds: [embed], components: [row] });
  setBotState('leaderboard_message_id', sent.id);
}

function startLeaderboardScheduler(client) {
  const timeframe = getBotState('leaderboard_timeframe') || 'alltime';
  refreshLeaderboard(client, timeframe).catch((err) => console.error('Initial leaderboard render failed:', err));

  setInterval(() => {
    const currentTimeframe = getBotState('leaderboard_timeframe') || 'alltime';
    refreshLeaderboard(client, currentTimeframe).catch((err) => console.error('Leaderboard refresh failed:', err));
  }, 5 * 60 * 1000);
}

async function handleTimeframeButton(interaction) {
  const key = interaction.customId.replace('leaderboard_tf_', '');
  setBotState('leaderboard_timeframe', key);
  const embed = await buildLeaderboardEmbed(interaction.client, key);
  const row = buildButtonsRow(key);
  await interaction.update({ embeds: [embed], components: [row] });
}

module.exports = { startLeaderboardScheduler, handleTimeframeButton, refreshLeaderboard };
