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
        for (const [, msg] of ownMessages) {
          await msg.delete().catch(() => {});
        }
      });
    }
  } catch (err) {
    console.error('Failed to clear old guide messages:', err);
  }
}

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.staffGuide);
    await clearOldMessages(channel);

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
        { name: '① Trial Staff', value: 'Can issue `/warn` and view `/warns`, plus the right-click Warn tool. Learning the ropes — closely observed by higher staff.' },
        { name: '② Staff', value: 'Everything above, plus `/kick`, `/unwarn`, and the right-click Kick tool. Can claim purchase tickets.' },
        { name: '③ Mod', value: 'Everything above, plus `/ban`, `/unban`, and the right-click Ban tool.' },
        { name: '④ Head Mod', value: 'Everything above, plus `/clearwarns` and oversight of Staff/Trial Staff.' },
        { name: '⑤ Manager', value: 'Full moderation authority, plus `/announcement` and `/task` — the only rank besides Owner allowed to post official announcements or create tasks. Involved in staff decisions and server direction.' },
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
        '✦ Abuse of permissions results in immediate rank removal — the server automatically flags unusual moderation activity.',
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [ranks] });
    await channel.send({ embeds: [rules] });
    console.log('Staff guide updated successfully.');
  } catch (err) {
    console.error('Failed to post staff guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
