const { Events } = require('discord.js');
const config = require('../config');
const { getSupportTicketByChannel, addTicketMessage } = require('../database/db');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;
    if (!message.channel.parentId || message.channel.parentId !== config.channels.supportTicketsCategory) return;

    const ticket = getSupportTicketByChannel(message.channelId);
    if (!ticket) return;

    addTicketMessage(ticket.id, message.author.id, message.author.tag, message.content || '[attachment/embed, no text]');
  },
};
