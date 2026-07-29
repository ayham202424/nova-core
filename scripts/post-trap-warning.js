const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.trapChannel);
    const embed = baseEmbed(client, {
      color: THEME.colors.danger,
      title: '⚠️ DO NOT SEND MESSAGES HERE',
      description:
        'This channel is for automated system notices only.\n\n' +
        '**If you type anything in this channel, you will be permanently banned. No warning, no exceptions.**',
    });
    await channel.send({ embeds: [embed] });
    console.log('Trap warning posted.');
  } catch (err) {
    console.error('Failed to post trap warning:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
