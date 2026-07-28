const { Events } = require('discord.js');
const config = require('../config');
const { getOrCreateUser } = require('../database/db');

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    try {
      getOrCreateUser(member.id);

      if (config.roles.unverified) {
        await member.roles.add(config.roles.unverified);
      }

      console.log(`${member.user.tag} joined and received the Unverified role.`);
    } catch (err) {
      console.error(`Failed to assign Unverified role to ${member.user.tag}:`, err);
    }
  },
};
