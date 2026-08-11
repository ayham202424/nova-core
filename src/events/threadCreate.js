const { Events } = require('discord.js');
const config = require('../config');

const VOTE_EMOJI = '👍';

module.exports = {
  name: Events.ThreadCreate,
  once: false,
  async execute(thread) {
    const trackedChannels = [config.channels.suggestionsThread, config.channels.creationsThread];
    if (!trackedChannels.includes(thread.parentId)) return;

    try {
      const starterMessage = await thread.fetchStarterMessage();
      if (starterMessage) {
        await starterMessage.react(VOTE_EMOJI);
      }
    } catch (err) {
      console.error('Failed to react to new thread starter message:', err);
    }
  },
};
