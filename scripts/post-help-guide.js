const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.help);

    const embed = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '🌙 Welcome to the Help Channel',
      description:
        'Quick answers to common questions about Nova-Creations.',
      fields: [
        { name: 'How does verification work?', value: `Head to <#${config.channels.verify}>, read the rules, and click Accept.` },
        { name: 'I have a verification problem', value: `Ask in <#${config.channels.verifyHelp}>.` },
        { name: 'How do warnings work?', value: 'Rule violations lead to warnings with automatic timeouts. Repeated violations escalate in severity.' },
        { name: 'How do I buy something?', value: 'Check the for-sale channels and open a ticket through the button on the listing you\'re interested in.' },
        { name: 'I need staff help', value: 'Open a support ticket, or contact any online staff member directly.' },
        { name: 'More features are coming', value: 'Leveling, ban appeals, and more systems are actively being built — this channel will be updated as they launch.' },
      ],
    });

    await channel.send({ embeds: [embed] });
    console.log('Help guide posted successfully.');
  } catch (err) {
    console.error('Failed to post help guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
