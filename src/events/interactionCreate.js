const { Events } = require('discord.js');
const verifyHandler = require('../handlers/verifyHandler');
const dmHandler = require('../handlers/dmHandler');
const dmMenuHandler = require('../handlers/dmMenuHandler');
const warnSelectHandler = require('../handlers/warnSelectHandler');
const contextModalHandler = require('../handlers/contextModalHandler');
const ticketFlow = require('../handlers/ticketFlow');
const pingSettingsHandler = require('../handlers/pingSettingsHandler');
const announcementFlow = require('../handlers/announcementFlow');
const taskFlow = require('../handlers/taskFlow');
const supportTicketFlow = require('../handlers/supportTicketFlow');
const leaderboardManager = require('../handlers/leaderboardManager');
const { baseEmbed, THEME } = require('../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        const errorEmbed = baseEmbed(interaction.client, {
          color: THEME.colors.danger,
          title: '⚠️ Something Went Wrong',
          description: 'This command hit an unexpected error. Please try again, and contact the owner if it keeps happening.',
        });
        const reply = { embeds: [errorEmbed], ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'verify_accept') return verifyHandler.handleAccept(interaction);
      if (interaction.customId.startsWith('staff_dm_open_')) return dmHandler.openModal(interaction);
      if (interaction.customId.startsWith('dm_menu_')) return dmMenuHandler.handleButton(interaction);
      if (interaction.customId.startsWith('market_interested_')) return ticketFlow.handleInterestedClick(interaction);
      if (interaction.customId.startsWith('market_claim_')) return ticketFlow.handleClaim(interaction);
      if (interaction.customId.startsWith('market_cancel_')) return ticketFlow.handleCancel(interaction);
      if (interaction.customId.startsWith('market_restore_')) return ticketFlow.handleRestore(interaction);
      if (interaction.customId.startsWith('market_close_')) return ticketFlow.handleClose(interaction);
      if (interaction.customId === 'pingsettings_open') return pingSettingsHandler.handleOpenMenu(interaction);
      if (interaction.customId.startsWith('pingtoggle_')) return pingSettingsHandler.handleToggle(interaction);
      if (interaction.customId === 'announce_everyone_toggle') return announcementFlow.handleEveryoneToggle(interaction);
      if (interaction.customId === 'announce_send') return announcementFlow.handleSend(interaction);
      if (interaction.customId === 'announce_cancel') return announcementFlow.handleCancel(interaction);
      if (interaction.customId.startsWith('task_claim_')) return taskFlow.handleClaim(interaction);
      if (interaction.customId.startsWith('task_done_')) return taskFlow.handleDone(interaction);
      if (interaction.customId.startsWith('task_cancel_')) return taskFlow.handleCancel(interaction);
      if (interaction.customId.startsWith('support_open_')) return supportTicketFlow.handleOpenClick(interaction);
      if (interaction.customId.startsWith('support_claim_')) return supportTicketFlow.handleClaim(interaction);
      if (interaction.customId.startsWith('support_cancel_')) return supportTicketFlow.handleCancel(interaction);
      if (interaction.customId.startsWith('support_complete_')) return supportTicketFlow.handleComplete(interaction);
      if (interaction.customId.startsWith('support_closeinvalid_')) return supportTicketFlow.handleCloseInvalid(interaction);
      if (interaction.customId.startsWith('support_rate_')) return supportTicketFlow.handleRate(interaction);
      if (interaction.customId.startsWith('support_reopen_')) return supportTicketFlow.handleReopenButton(interaction);
      if (interaction.customId.startsWith('leaderboard_tf_')) return leaderboardManager.handleTimeframeButton(interaction);
      return;
    }

    if (interaction.isChannelSelectMenu()) {
      if (interaction.customId === 'announce_channel_select') return announcementFlow.handleChannelSelect(interaction);
      if (interaction.customId === 'task_channel_select') return taskFlow.handleChannelSelect(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('unwarn_select_')) return warnSelectHandler.handleUnwarnSelect(interaction);
      if (interaction.customId === 'market_payment_select') return ticketFlow.handlePaymentSelect(interaction);
      if (interaction.customId === 'announce_ping_select') return announcementFlow.handlePingSelect(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('staff_dm_modal_')) return dmHandler.submitModal(interaction);
      if (interaction.customId === 'dm_contact_owner_modal') return dmMenuHandler.handleContactModal(interaction);
      if (
        interaction.customId.startsWith('ctxwarn_') ||
        interaction.customId.startsWith('ctxkick_') ||
        interaction.customId.startsWith('ctxban_')
      ) {
        return contextModalHandler.handleContextModal(interaction);
      }
      if (interaction.customId.startsWith('market_username_modal_')) return ticketFlow.handleUsernameModalSubmit(interaction);
      if (interaction.customId.startsWith('support_modal_')) return supportTicketFlow.handleModalSubmit(interaction);
      if (interaction.customId.startsWith('support_feedback_modal_')) return supportTicketFlow.handleFeedbackSubmit(interaction);
      if (interaction.customId.startsWith('support_invalid_modal_')) return supportTicketFlow.handleInvalidModalSubmit(interaction);
    }
  },
};
