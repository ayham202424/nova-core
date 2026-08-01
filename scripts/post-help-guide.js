const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');

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
    console.error('Failed to clear old help messages:', err);
  }
}

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.help);
    await clearOldMessages(channel);

    const embed = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '🌙 Welcome to the Help Channel',
      description: 'Quick answers to common questions about Nova-Creations. Run `/help` anywhere for a full list of bot commands.',
      fields: [
        { name: 'How does verification work?', value: `Head to <#${config.channels.verify}>, read the rules, and click Accept.` },
        { name: 'I have a verification problem', value: `Ask in <#${config.channels.verifyHelp}>.` },
        { name: 'How do warnings work?', value: 'Rule violations lead to warnings with automatic timeouts. Repeated violations escalate in severity.' },
        { name: 'How do I buy something?', value: 'Check the for-sale channels and click "I\'m Interested" on the listing you want.' },
        { name: 'How does leveling work?', value: `Chat and react to earn XP — see <#${config.channels.levelInfo}> for the full breakdown, milestones, and perks.` },
        { name: 'How do I control what I get pinged for?', value: `Head to <#${config.channels.pingSettings}> and click the button to open your personal settings.` },
        { name: 'I need staff help', value: 'Open a support ticket, or contact any online staff member directly.' },
        { name: 'More features are coming', value: 'Ban appeals and giveaways are actively being built — this channel will be updated as they launch.' },
      ],
    });

    await channel.send({ embeds: [embed] });
    console.log('Help guide updated successfully.');
  } catch (err) {
    console.error('Failed to post help guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
