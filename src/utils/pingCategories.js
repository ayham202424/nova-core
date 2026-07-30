const config = require('../config');

const PING_CATEGORIES = [
  { key: 'announcement', roleId: config.pingRoles.announcement, label: 'Announcements', emoji: '📢' },
  { key: 'giveaway', roleId: config.pingRoles.giveaway, label: 'Giveaways', emoji: '🎉' },
  { key: 'partner', roleId: config.pingRoles.partner, label: 'Partnerships', emoji: '🤝' },
  { key: 'event', roleId: config.pingRoles.event, label: 'Events', emoji: '📅' },
];

module.exports = { PING_CATEGORIES };
