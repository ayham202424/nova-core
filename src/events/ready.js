const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Nova Core is online as ${client.user.tag}`);
  },
};
