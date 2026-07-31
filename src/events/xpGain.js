const { Events } = require('discord.js');
const { getProtectedChannels } = require('../utils/protectedChannels');
const { getOrCreateUser, incrementMessagesTotal, recordMessageActivity, addXp, recordXpActivity } = require('../database/db');
const { announceLevelUp } = require('../utils/levelAnnounce');

const xpCooldowns = new Map();
const XP_COOLDOWN_MS = 60 * 1000;
const XP_MIN = 15;
const XP_MAX = 25;

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (getProtectedChannels().includes(message.channelId)) return;

    getOrCreateUser(message.author.id);
    incrementMessagesTotal(message.author.id);
    recordMessageActivity(message.author.id);

    const now = Date.now();
    const lastXp = xpCooldowns.get(message.author.id) || 0;
    if (now - lastXp < XP_COOLDOWN_MS) return;
    xpCooldowns.set(message.author.id, now);

    const baseAmount = Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
    const isBooster = Boolean(message.member?.premiumSinceTimestamp);
    const result = addXp(message.author.id, baseAmount, isBooster);
    recordXpActivity(message.author.id, result.xpGained);

    if (result.leveledUp) {
      await announceLevelUp(message.client, message.guild, message.member, result.oldLevel, result.newLevel);
    }
  },
};
