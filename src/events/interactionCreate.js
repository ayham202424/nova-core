const { Events } = require('discord.js');
const verifyHandler = require('../handlers/verifyHandler');
const dmHandler = require('../handlers/dmHandler');
const dmMenuHandler = require('../handlers/dmMenuHandler');
const warnSelectHandler = require('../handlers/warnSelectHandler');
const { baseEmbed, THEME } = require('../utils/embeds');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(err);
        const errorEmbed = baseEmbed(interaction.client, {
          color: THEME.colors.danger,
          title: '⚠️ Something Went Wrong',
          description:
            'This command hit an unexpected error. It has been logged in the console — please try again, ' +
            'and contact the owner if it keeps happening.',
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
      if (interaction.customId === 'verify_accept') {
        return verifyHandler.handleAccept(interaction);
      }
      if (interaction.customId.startsWith('staff_dm_open_')) {
        return dmHandler.openModal(interaction);
      }
      if (interaction.customId.startsWith('dm_menu_')) {
        return dmMenuHandler.handleButton(interaction);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('unwarn_select_')) {
        return warnSelectHandler.handleUnwarnSelect(interaction);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('staff_dm_modal_')) {
        return dmHandler.submitModal(interaction);
      }
      if (interaction.customId === 'dm_contact_owner_modal') {
        return dmMenuHandler.handleContactModal(interaction);
      }
    }
  },
};
