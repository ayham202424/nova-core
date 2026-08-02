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
        { name: '🔹 General (Everyone)', value: '`/ping` — Check if the bot is online\n`/help` — Show this menu' },
        { name: '🔸 Trial Staff+', value: '`/warn`, `/warns`, right-click Warn tool' },
        { name: '🔸 Staff+', value: '`/unwarn`, `/restoreticket`, `/reopenticket`' },
        { name: '🔸 Mod+', value: '`/kick`, right-click Kick tool' },
        { name: '🔸 Head Mod+', value: '`/ban`, `/unban`, right-click Ban tool, review Ban/Kick Appeals' },
        { name: '🔸 Community Manager+', value: '`/clearwarns`' },
        { name: '⭐ Manager+', value: '`/announcement`, `/task`, `/setlevel`, claims Staff LOA/Help tickets' },
        { name: '📨 Ban/Kick Appeals', value: 'Banned or kicked members get a "Submit an Appeal" button in their DM — no server access needed.' },
        { name: '🔔 Ping Settings', value: `Head to <#${config.channels.pingSettings}> to choose exactly what you get pinged for.` },
        { name: '🛒 Purchases & Support', value: 'No command needed — click a button in the for-sale channels or support panel.' },
      ],
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
