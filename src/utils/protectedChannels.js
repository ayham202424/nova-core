const config = require('../config');

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
  ].filter(Boolean);
}

module.exports = { getProtectedChannels };
