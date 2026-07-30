const { Events } = require('discord.js');
const config = require('../config');
const { getProtectedChannels } = require('../utils/protectedChannels');
const { getSpamStage, recordSpamNotice } = require('../database/db');
const { issueWarn } = require('../utils/autoWarn');
const { THEME, baseEmbed } = require('../utils/embeds');

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
      setTimeout(() => recentlyActioned.delete(message.author.id), 10000);
      messageTimestamps.delete(message.author.id);

      try {
        await message.delete();
      } catch (err) {
        // ignore
      }

      const stage = getSpamStage(message.author.id);
      recordSpamNotice(message.author.id);

      if (stage === 'notice') {
        try {
          await message.member.timeout(30 * 1000, 'Anti-spam: sending messages too quickly');
        } catch (err) {
          console.error('Failed to apply spam notice timeout:', err);
        }

        try {
          const dmEmbed = baseEmbed(message.client, {
            color: THEME.colors.warning,
            title: '🐢 Slow Down',
            description:
              "You're sending messages too quickly, so you've been put in a 30-second timeout to chill out.\n\n" +
              "This is just a heads-up, not a formal warning. If it happens again within 24 hours, you'll start receiving real warnings.",
          });
          await message.author.send({ embeds: [dmEmbed] });
        } catch (err) {
          // DMs closed
        }

        try {
          const logChannel = await message.client.channels.fetch(config.channels.cmdsLogs);
          const logEmbed = baseEmbed(message.client, {
            color: THEME.colors.warning,
            authorName: message.author.tag,
            authorIcon: message.author.displayAvatarURL(),
            title: '🐢 Spam Notice (No Formal Warn)',
            description: `${message.author} sent ${SPAM_THRESHOLD}+ messages within ${SPAM_WINDOW_MS / 1000} seconds. Given a 30-second cooldown as a first heads-up.`,
          });
          await logChannel.send({ embeds: [logEmbed] });
        } catch (err) {
          console.error('Failed to log spam notice:', err);
        }
      } else {
        await issueWarn({
          client: message.client,
          guild: message.guild,
          targetUser: message.author,
          moderatorLabel: 'Automated System (Anti-Spam)',
          moderatorId: message.client.user.id,
          reason: `Continued spamming after already being asked to slow down (${SPAM_THRESHOLD}+ messages within ${SPAM_WINDOW_MS / 1000}s)`,
        });
      }
    }
  },
};
