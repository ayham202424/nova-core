const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');
const { PING_CATEGORIES } = require('../src/utils/pingCategories');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function clearOldMessages(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const ownMessages = messages.filter((m) => m.author.id === channel.client.user.id);
    if (ownMessages.size > 0) {
      await channel.bulkDelete(ownMessages, true).catch(async () => {
        for (const [, msg] of ownMessages) await msg.delete().catch(() => {});
      });
    }
  } catch (err) {
    console.error('Failed to clear old panel messages:', err);
  }
}

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.pingSettings);
    await clearOldMessages(channel);

    const embed = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '🔔 Ping Settings',
      description:
        "Choose exactly what you want to be pinged for. Click the button below to open your personal menu — " +
        "only you can see it, and it always shows exactly what's active for you right now.",
      fields: PING_CATEGORIES.map((cat) => ({ name: `${cat.emoji} ${cat.label}`, value: 'Toggle in your personal menu', inline: true })),
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pingsettings_open').setLabel('Manage My Ping Settings').setEmoji('🔔').setStyle(ButtonStyle.Primary)
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
