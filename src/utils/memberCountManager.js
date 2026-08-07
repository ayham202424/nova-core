const config = require('../config');
const { getBotState, setBotState } = require('../database/db');
const { THEME, baseEmbed } = require('./embeds');

const MIN_UPDATE_INTERVAL_MS = 10 * 1000; // light debounce so mass join/leave bursts don't spam edits

async function updateMemberCountChannel(client) {
  const channelId = getBotState('member_count_channel_id');
  const messageId = getBotState('member_count_message_id');
  if (!channelId || !messageId) return;

  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) return;

  const currentCount = guild.memberCount;
  const storedPeak = parseInt(getBotState('member_count_peak') || '0', 10);
  const newPeak = Math.max(currentCount, storedPeak);
  if (newPeak !== storedPeak) setBotState('member_count_peak', newPeak);

  const lastUpdate = parseInt(getBotState('member_count_last_update') || '0', 10);
  const now = Date.now();
  if (now - lastUpdate < MIN_UPDATE_INTERVAL_MS) return;

  try {
    const channel = await guild.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);

    const embed = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '👥 Nova-Creations Member Count',
      description: `**Current Members:** ${currentCount}\n**All-Time Peak:** ${newPeak}`,
    });

    await message.edit({ embeds: [embed] });
    setBotState('member_count_last_update', now);
  } catch (err) {
    console.error('Failed to update member count message:', err);
  }
}

module.exports = { updateMemberCountChannel };
