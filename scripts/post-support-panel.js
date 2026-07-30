const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');
const { SUPPORT_CATEGORIES } = require('../src/utils/supportCategories');

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
    const channel = await client.channels.fetch(config.channels.supportPanel);
    await clearOldMessages(channel);

    const embed = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '🎫 Open a Support Ticket',
      description: 'Choose a category below. You\'ll be asked a few quick questions, then a staff member will claim your ticket.',
    });

    const row = new ActionRowBuilder().addComponents(
      Object.entries(SUPPORT_CATEGORIES).map(([key, cat]) =>
        new ButtonBuilder().setCustomId(`support_open_${key}`).setLabel(cat.label).setEmoji(cat.emoji).setStyle(ButtonStyle.Primary)
      )
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log('Support panel posted successfully.');
  } catch (err) {
    console.error('Failed to post support panel:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
