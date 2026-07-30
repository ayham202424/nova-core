const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');
const { PING_CATEGORIES } = require('../src/utils/pingCategories');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.pingSettings);

    const embed = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '🔔 Ping Settings',
      description:
        'Choose exactly what you want to be pinged for. Click a button to toggle it on or off — you can change this anytime.\n\n' +
        'Note: for truly urgent, server-wide notices, staff may occasionally ping everyone regardless of these settings.',
      fields: PING_CATEGORIES.map((cat) => ({ name: `${cat.emoji} ${cat.label}`, value: 'Click below to toggle', inline: true })),
    });

    const row = new ActionRowBuilder().addComponents(
      PING_CATEGORIES.map((cat) =>
        new ButtonBuilder().setCustomId(`pingtoggle_${cat.key}`).setLabel(cat.label).setEmoji(cat.emoji).setStyle(ButtonStyle.Secondary)
      )
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log('Ping settings message posted.');
  } catch (err) {
    console.error('Failed to post ping settings:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
