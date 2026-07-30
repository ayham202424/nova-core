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
    ui: process.env.UI_CHANNEL_ID,
    builds: process.env.BUILDS_CHANNEL_ID,
    scripts: process.env.SCRIPTS_CHANNEL_ID,
    animations: process.env.ANIMATIONS_CHANNEL_ID,
    ticketsCategory: process.env.TICKETS_CATEGORY_ID,
    ticketLogs: process.env.TICKET_LOGS_CHANNEL_ID,
    pingSettings: process.env.PING_SETTINGS_CHANNEL_ID,
    supportPanel: process.env.SUPPORT_PANEL_CHANNEL_ID,
    supportTicketsCategory: process.env.SUPPORT_TICKETS_CATEGORY_ID,
    supportTicketLogs: process.env.SUPPORT_TICKET_LOGS_CHANNEL_ID,
  },

  roles: {
    unverified: process.env.UNVERIFIED_ROLE_ID,
    member: process.env.MEMBER_ROLE_ID,
    trialStaff: process.env.TRIAL_STAFF_ROLE_ID,
    staff: process.env.STAFF_ROLE_ID,
    headStaff: process.env.HEAD_STAFF_ROLE_ID,
    juniorMod: process.env.JUNIOR_MOD_ROLE_ID,
    mod: process.env.MOD_ROLE_ID,
    headMod: process.env.HEAD_MOD_ROLE_ID,
    communityManager: process.env.COMMUNITY_MANAGER_ROLE_ID,
    projectManager: process.env.PROJECT_MANAGER_ROLE_ID,
    manager: process.env.MANAGER_ROLE_ID,
    coFounder: process.env.CO_FOUNDER_ROLE_ID,
    founder: process.env.FOUNDER_ROLE_ID,
  },

  pingRoles: {
    announcement: process.env.ANNOUNCEMENT_PING_ROLE_ID,
    giveaway: process.env.GIVEAWAY_PING_ROLE_ID,
    partner: process.env.PARTNER_PING_ROLE_ID,
    event: process.env.EVENT_PING_ROLE_ID,
  },

  verifyBannerUrl: process.env.VERIFY_BANNER_URL || null,
};
