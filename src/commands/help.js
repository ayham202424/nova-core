const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Shows every command Nova Core offers and who can use it.'),

  async execute(interaction) {
    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      title: '🌙 Nova Core — Command Overview',
      description: 'Everything the bot can do. Full details are also in the staff/cmds guide channels.',
      fields: [
        {
          name: '🔹 General (Everyone)',
          value: '`/ping` — Check if the bot is online\n`/help` — Show this menu',
        },
        {
          name: '🔸 Moderation — Trial Staff+',
          value: '`/warn` — Warn a member (timeout escalates automatically)\n`/warns` — View a member\'s warning history',
        },
        {
          name: '🔸 Moderation — Staff+',
          value: '`/kick` — Kick a member\n`/unwarn` — Remove a specific warning',
        },
        {
          name: '🔸 Moderation — Mod+',
          value: '`/ban` — Ban a member\n`/unban` — Unban by User ID',
        },
        {
          name: '🔸 Moderation — Head Mod+',
          value: '`/clearwarns` — Wipe a member\'s entire warning history',
        },
        {
          name: '🖱️ Right-Click Tools (Trial Staff+)',
          value: 'Right-click any message → Apps → **Warn / Kick / Ban (use as proof)** — moderates the author with that message auto-attached as proof.',
        },
        {
          name: '⭐ Staff & Management — Manager+',
          value: '`/announcement` — Post a formatted announcement with banner, channel & ping selection\n`/task` — Create a claimable task for staff/developers',
        },
        {
          name: '🔔 Ping Settings',
          value: `Head to <#${config.channels.pingSettings}> to choose exactly what you get pinged for.`,
        },
        {
          name: '🛒 Purchases',
          value: 'No command needed — click **"I\'m Interested"** on any listing in the for-sale channels.',
        },
      ],
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
