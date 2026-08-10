const { THEME, baseEmbed } = require('./embeds');
const { getActiveTimers, getTimer, completeTimer } = require('../database/db');

function startTimerScheduler(client) {
  setInterval(async () => {
    const activeTimers = getActiveTimers();
    const now = Date.now();

    for (const timer of activeTimers) {
      try {
        const channel = await client.channels.fetch(timer.channel_id).catch(() => null);
        if (!channel) {
          completeTimer(timer.id);
          continue;
        }

        const isFinished = new Date(timer.end_time).getTime() <= now;
        const message = timer.message_id ? await channel.messages.fetch(timer.message_id).catch(() => null) : null;
        const creator = await client.users.fetch(timer.user_id).catch(() => null);
        const creatorTag = creator ? creator.tag : 'Unknown';

        if (!isFinished) {
          if (message) {
            const embed = baseEmbed(client, {
              color: THEME.colors.primary,
              title: `⏳ ${timer.title || 'Timer'}`,
              description: `Ends: <t:${Math.floor(new Date(timer.end_time).getTime() / 1000)}:R> (<t:${Math.floor(new Date(timer.end_time).getTime() / 1000)}:F>)\nStarted by ${creatorTag}`,
            });
            await message.edit({ embeds: [embed] }).catch(() => {});
          }
          continue;
        }

        completeTimer(timer.id);

        const finishedEmbed = baseEmbed(client, {
          color: THEME.colors.success,
          title: `⏰ ${timer.title || 'Timer'} — Finished!`,
          description: `Started by ${creatorTag}. Time's up!`,
        });

        if (message) {
          await message.edit({ embeds: [finishedEmbed] }).catch(() => {});
        }
        await channel.send({ content: `${creator ? creator.toString() : ''}`, embeds: [finishedEmbed] }).catch(() => {});
      } catch (err) {
        console.error('Failed to process timer:', err);
      }
    }
  }, 60 * 1000);
}

module.exports = { startTimerScheduler };
