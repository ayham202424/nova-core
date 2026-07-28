const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.staffGuide);

    const intro = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '📖 Staff Guide — Ranks & Responsibilities',
      description: 'This channel explains every staff rank, what it can do, and how promotion works.',
    });

    const ranks = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Rank Hierarchy',
      description: 'Ranks are listed from lowest to highest. Higher ranks include all permissions of lower ranks.',
      fields: [
        { name: '① Trial Staff', value: 'Can issue `/warn`. Learning the ropes — closely observed by higher staff.' },
        { name: '② Staff', value: 'Everything above, plus `/kick` and `/unwarn`.' },
        { name: '③ Mod', value: 'Everything above, plus `/ban` and `/unban`.' },
        { name: '④ Head Mod', value: 'Everything above, plus `/clearwarns` and oversight of Staff/Trial Staff.' },
        { name: '⑤ Manager', value: 'Full moderation authority, involved in staff decisions and server direction.' },
        { name: '⑥ Owner', value: 'Full control over the server and all systems.' },
      ],
    });

    const rules = baseEmbed(client, {
      color: THEME.colors.warning,
      title: 'Staff Conduct Rules',
      description:
        '✦ Always provide a reason and proof when moderating — every action is logged automatically.\n' +
        '✦ Never moderate a staff member of equal or higher rank.\n' +
        '✦ Stay respectful, even with difficult members.\n' +
        '✦ If unsure about a situation, ask a higher rank before acting.\n' +
        '✦ Abuse of permissions results in immediate rank removal.',
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [ranks] });
    await channel.send({ embeds: [rules] });
    console.log('Staff guide posted successfully.');
  } catch (err) {
    console.error('Failed to post staff guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
