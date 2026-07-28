require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  channels: {
    verify: process.env.VERIFY_CHANNEL_ID,
    verifyHelp: process.env.VERIFY_HELP_CHANNEL_ID,
    messageLogs: process.env.MESSAGE_LOGS_CHANNEL_ID,
    serverLogs: process.env.SERVER_LOGS_CHANNEL_ID,
    cmdsLogs: process.env.CMDS_LOGS_CHANNEL_ID,
    userLogs: process.env.USER_LOGS_CHANNEL_ID,
  },

  roles: {
    unverified: process.env.UNVERIFIED_ROLE_ID,
    member: process.env.MEMBER_ROLE_ID,
  },

  verifyBannerUrl: process.env.VERIFY_BANNER_URL || null,
};
