const { Events } = require('discord.js');
const { getProtectedChannels } = require('../utils/protectedChannels');
const { getOrCreateUser, addXp, recordXpActivity } = require('../database/db');
const { announceLevelUp } = require('../utils/levelAnnounce');

const reactionCooldowns = new Map();
const REACTION_COOLDOWN_MS = 60 * 1000;
const REACTION_XP = 5;

module.exports = {
  name: Events.MessageReactionAdd,
  once: false,
  async execute(reaction, user) {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        return;
      }
    }
    if (!reaction.message.guild) return;
    if (getProtectedChannels().includes(reaction.message.channelId)) return;

    const now = Date.now();
    const last = reactionCooldowns.get(user.id) || 0;
    if (now - last < REACTION_COOLDOWN_MS) return;
    reactionCooldowns.set(user.id, now);

    getOrCreateUser(user.id);
    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    const isBooster = Boolean(member?.premiumSinceTimestamp);
    const result = addXp(user.id, REACTION_XP, isBooster);
    recordXpActivity(user.id, result.xpGained);

    if (result.leveledUp) {
      await announceLevelUp(reaction.client, reaction.message.guild, member, result.oldLevel, result.newLevel);
    }
  },
};
