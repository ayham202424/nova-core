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
    console.error('Failed to clear old level-info messages:', err);
  }
}

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.levelInfo);
    await clearOldMessages(channel);

    const intro = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '🌙 How Leveling Works',
      description:
        'You earn XP by chatting and reacting to messages (with a short cooldown to prevent farming). ' +
        'The higher your level, the more XP the next one requires — it gets harder the further you go.',
    });

    const milestones = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Milestone Roles',
      description: 'At these levels, your previous role is automatically swapped for a new one:',
      fields: [{ name: 'Milestones', value: 'Level 1, 5, 10, 15, 20, 25, 30 (max)' }],
    });

    const perks = baseEmbed(client, {
      color: THEME.colors.warning,
      title: 'Perks & Requirements',
      fields: [
        { name: '💎 Server Boosters', value: 'Get the VIP role automatically and earn 1.5x XP on everything.' },
        { name: '🔒 Content Requirements', value: 'Links: Level 3+ · GIFs: Level 5+ · Files: Level 10+ (staff are exempt)' },
      ],
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [milestones] });
    await channel.send({ embeds: [perks] });
    console.log('Level info posted successfully.');
  } catch (err) {
    console.error('Failed to post level info:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
