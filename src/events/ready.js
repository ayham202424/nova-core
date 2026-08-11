const { Events } = require('discord.js');
const config = require('../config');
const { startLeaderboardScheduler } = require('../handlers/leaderboardManager');
const { initInviteCache } = require('../utils/inviteTracker');
const { startGiveawayScheduler } = require('../utils/giveawayScheduler');
const { updateMemberCountChannel } = require('../utils/memberCountManager');
const { startTimerScheduler } = require('../utils/timerScheduler');
const { startWeeklyHighlightScheduler } = require('../utils/weeklyHighlightScheduler');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Nova Core is online as ${client.user.tag}`);
    startLeaderboardScheduler(client);
    startGiveawayScheduler(client);
    startTimerScheduler(client);
    startWeeklyHighlightScheduler(client);

    const guild = client.guilds.cache.get(config.guildId);
    if (guild) {
      await initInviteCache(guild);
    }

    updateMemberCountChannel(client).catch((err) => console.error('Initial member count update failed:', err));
    setInterval(() => {
      updateMemberCountChannel(client).catch((err) => console.error('Member count update failed:', err));
    }, 3 * 60 * 1000);
  },
};
