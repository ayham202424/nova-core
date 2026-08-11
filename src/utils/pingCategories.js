const config = require('../config');
const { getBotState } = require('../database/db');

function getPingCategories() {
  return [
    { key: 'announcement', roleId: config.pingRoles.announcement, label: 'Announcements', emoji: '📢' },
    { key: 'giveaway', roleId: config.pingRoles.giveaway, label: 'Giveaways', emoji: '🎉' },
    { key: 'partner', roleId: config.pingRoles.partner, label: 'Partnerships', emoji: '🤝' },
    { key: 'event', roleId: config.pingRoles.event, label: 'Events', emoji: '📅' },
    {
      key: 'creations',
      roleId: getBotState('creations_suggestions_ping_role_id'),
      label: 'Suggestions + Creation of the Week',
      emoji: '🗳️',
    },
  ].filter((c) => c.roleId);
}

module.exports = { getPingCategories };
