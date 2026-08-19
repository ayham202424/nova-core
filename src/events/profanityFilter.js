const { Events } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    // Language filter temporarily disabled — was flagging harmless words.
    // Re-enable by restoring the logic here when ready.
    return;
  },
};
