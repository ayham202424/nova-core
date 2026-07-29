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
    staffGuide: process.env.STAFF_GUIDE_CHANNEL_ID,
    cmdsGuide: process.env.CMDS_GUIDE_CHANNEL_ID,
    help: process.env.HELP_CHANNEL_ID,
    trapChannel: process.env.TRAP_CHANNEL_ID,
  },

  roles: {
    unverified: process.env.UNVERIFIED_ROLE_ID,
    member: process.env.MEMBER_ROLE_ID,
    trialStaff: process.env.TRIAL_STAFF_ROLE_ID,
    staff: process.env.STAFF_ROLE_ID,
    mod: process.env.MOD_ROLE_ID,
    headMod: process.env.HEAD_MOD_ROLE_ID,
    manager: process.env.MANAGER_ROLE_ID,
  },

  verifyBannerUrl: process.env.VERIFY_BANNER_URL || null,
};
