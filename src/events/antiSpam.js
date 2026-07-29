const { Events } = require('discord.js');
const config = require('../config');
const { getProtectedChannels } = require('../utils/protectedChannels');
const { issueWarn } = require('../utils/autoWarn');

const messageTimestamps = new Map();
const recentlyActioned = new Set();
const SPAM_WINDOW_MS = 5000;
const SPAM_THRESHOLD = 4;

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (getProtectedChannels().includes(message.channelId)) return;
    if (config.channels.trapChannel && message.channelId === config.channels.trapChannel) return;
    if (recentlyActioned.has(message.author.id)) return;

    const now = Date.now();
    const timestamps = (messageTimestamps.get(message.author.id) || []).filter((t) => now - t < SPAM_WINDOW_MS);
    timestamps.push(now);
    messageTimestamps.set(message.author.id, timestamps);

    if (timestamps.length >= SPAM_THRESHOLD) {
      recentlyActioned.add(message.author.id);
      setTimeout(() => recentlyActioned.delete(message.author.id), 30000);
      messageTimestamps.delete(message.author.id);

      try {
        await message.delete();
      } catch (err) {
        // ignore
      }

      await issueWarn({
        client: message.client,
        guild: message.guild,
        targetUser: message.author,
        moderatorLabel: 'Automated System (Anti-Spam)',
        moderatorId: message.client.user.id,
        reason: `Sent ${SPAM_THRESHOLD}+ messages within ${SPAM_WINDOW_MS / 1000} seconds`,
      });
    }
  },
};
