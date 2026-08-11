const config = require('../config');
const { THEME, baseEmbed } = require('./embeds');
const { getBotState, setBotState } = require('../database/db');

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const VOTE_EMOJI = '👍';

async function getThreadsSince(channel, cutoffMs) {
  const active = await channel.threads.fetchActive();
  const archived = await channel.threads.fetchArchived();
  const allThreads = [...active.threads.values(), ...archived.threads.values()];
  return allThreads.filter((t) => t.createdTimestamp && t.createdTimestamp >= cutoffMs);
}

async function getVoteCount(thread) {
  try {
    const starterMessage = await thread.fetchStarterMessage();
    if (!starterMessage) return 0;
    const reaction = starterMessage.reactions.cache.get(VOTE_EMOJI);
    if (!reaction) return 0;
    return Math.max(reaction.count - 1, 0); // subtract the bot's own auto-reaction
  } catch (err) {
    return 0;
  }
}

async function findWinningThread(channel, cutoffMs) {
  const threads = await getThreadsSince(channel, cutoffMs);
  let best = null;
  let bestVotes = -1;
  for (const thread of threads) {
    const votes = await getVoteCount(thread);
    if (votes > bestVotes) {
      bestVotes = votes;
      best = thread;
    }
  }
  return best ? { thread: best, votes: bestVotes } : null;
}

async function postWeeklySuggestion(client) {
  const channel = await client.channels.fetch(config.channels.suggestionsThread).catch(() => null);
  const targetChannel = await client.channels.fetch(config.channels.topSuggestion).catch(() => null);
  if (!channel || !targetChannel) return;

  const cutoffMs = Date.now() - WEEK_MS;
  const result = await findWinningThread(channel, cutoffMs);
  const pingRoleId = getBotState('creations_suggestions_ping_role_id');

  if (!result) {
    const embed = baseEmbed(client, {
      color: THEME.colors.warning,
      title: '🗳️ Weekly Suggestion Highlight',
      description: `Nobody posted a new suggestion this week! Head over to <#${config.channels.suggestionsThread}> to share your idea for next week.`,
    });
    await targetChannel.send({ embeds: [embed] });
  } else {
    const { thread, votes } = result;
    const embed = baseEmbed(client, {
      color: THEME.colors.success,
      title: `🗳️ Suggestion of the Week: ${thread.name}`,
      description:
        `**Suggested by:** ${thread.ownerId ? `<@${thread.ownerId}>` : 'Unknown'}\n` +
        `**Votes:** ${votes} 👍\n` +
        `**Original post:** [Jump to thread](${thread.url})\n\n` +
        `React below with 🇱 or 🇼 to weigh in!`,
    });
    const sent = await targetChannel.send({
      content: pingRoleId ? `<@&${pingRoleId}>` : undefined,
      embeds: [embed],
      allowedMentions: pingRoleId ? { roles: [pingRoleId] } : undefined,
    });
    await sent.react('🇱').catch(() => {});
    await sent.react('🇼').catch(() => {});
  }

  setBotState('last_suggestion_post_at', String(Date.now()));
}

async function postWeeklyCreation(client) {
  const channel = await client.channels.fetch(config.channels.creationsThread).catch(() => null);
  const targetChannel = await client.channels.fetch(config.channels.creationOfWeek).catch(() => null);
  if (!channel || !targetChannel) return;

  const cutoffMs = Date.now() - WEEK_MS;
  const result = await findWinningThread(channel, cutoffMs);
  const pingRoleId = getBotState('creations_suggestions_ping_role_id');
  const nextPostTimestamp = Math.floor((Date.now() + WEEK_MS) / 1000);

  if (!result) {
    const embed = baseEmbed(client, {
      color: THEME.colors.warning,
      title: '🎨 Creation of the Week',
      description: `Nobody posted a new creation this week! Head over to <#${config.channels.creationsThread}> to share your work for next week.`,
    });
    await targetChannel.send({ embeds: [embed] });
  } else {
    const { thread, votes } = result;
    const embed = baseEmbed(client, {
      color: THEME.colors.success,
      title: `🎨 Creation of the Week: ${thread.name}`,
      description:
        `**Created by:** ${thread.ownerId ? `<@${thread.ownerId}>` : 'Unknown'}\n` +
        `**Votes:** ${votes} 👍\n` +
        `**Original post:** [Jump to thread](${thread.url})\n\n` +
        `**Featured until:** <t:${nextPostTimestamp}:F>\n` +
        `**Next Creation of the Week:** <t:${nextPostTimestamp}:R>\n\n` +
        `React below with 🇱 or 🇼!`,
    });
    const sent = await targetChannel.send({
      content: pingRoleId ? `<@&${pingRoleId}>` : undefined,
      embeds: [embed],
      allowedMentions: pingRoleId ? { roles: [pingRoleId] } : undefined,
    });
    await sent.react('🇱').catch(() => {});
    await sent.react('🇼').catch(() => {});
  }

  setBotState('last_creation_post_at', String(Date.now()));
}

function startWeeklyHighlightScheduler(client) {
  const check = async () => {
    const now = Date.now();
    const lastSuggestion = parseInt(getBotState('last_suggestion_post_at') || '0', 10);
    if (now - lastSuggestion >= WEEK_MS) {
      await postWeeklySuggestion(client).catch((err) => console.error('Weekly suggestion post failed:', err));
    }
    const lastCreation = parseInt(getBotState('last_creation_post_at') || '0', 10);
    if (now - lastCreation >= WEEK_MS) {
      await postWeeklyCreation(client).catch((err) => console.error('Weekly creation post failed:', err));
    }
  };

  check();
  setInterval(check, 6 * 60 * 60 * 1000);
}

module.exports = { startWeeklyHighlightScheduler };
