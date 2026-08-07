const config = require('../config');
const { getBotState } = require('../database/db');

function getProtectedChannels() {
  return [
    config.channels.messageLogs,
    config.channels.serverLogs,
    config.channels.cmdsLogs,
    config.channels.userLogs,
    config.channels.staffGuide,
    config.channels.cmdsGuide,
    config.channels.help,
    config.channels.supportTicketLogs,
    config.channels.supportPanel,
    getBotState('member_count_channel_id'),
  ].filter(Boolean);
}

module.exports = { getProtectedChannels };
