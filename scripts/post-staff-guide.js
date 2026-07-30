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
      description: 'This channel explains every staff rank and what it can do. Ranks are listed lowest to highest — each includes everything below it.',
    });

    const ranksPart1 = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Ranks ① – ⑥',
      fields: [
        { name: '① Trial Staff', value: '`/warn`, `/warns`, right-click Warn. Learning the ropes, closely observed.' },
        { name: '② Staff', value: '+ `/unwarn`, `/restoreticket`, `/reopenticket`. Can claim purchase & support tickets.' },
        { name: '③ Head Staff', value: 'Oversight of Trial Staff and Staff.' },
        { name: '④ Junior Mod', value: 'Transitional rank between Staff and Mod.' },
        { name: '⑤ Mod', value: '+ `/kick`, right-click Kick.' },
        { name: '⑥ Head Mod', value: '+ `/ban`, `/unban`, right-click Ban.' },
      ],
    });

    const ranksPart2 = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Ranks ⑦ – ⑪ + Owner',
      fields: [
        { name: '⑦ Community Manager', value: '+ `/clearwarns`.' },
        { name: '⑧ Project Manager', value: 'Oversees ongoing projects and development.' },
        { name: '⑨ Manager', value: '+ `/announcement`, `/task`. Only rank besides Owner that sees and claims Staff LOA/Help tickets.' },
        { name: '⑩ Co-Founder', value: 'Full authority alongside the Founder.' },
        { name: '⑪ Founder', value: 'Full authority over the server.' },
        { name: 'Owner', value: 'The Discord server owner — full control, always highest rank automatically.' },
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
        '✦ Abuse of permissions results in immediate rank removal — 3+ kicks/bans by one person within an hour auto-locks their account and alerts leadership.\n' +
        `✦ Need time off or have a staff-only issue? Open a "Staff LOA / Help" ticket via <#${config.channels.supportPanel}>.`,
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [ranksPart1] });
    await channel.send({ embeds: [ranksPart2] });
    await channel.send({ embeds: [rules] });
    console.log('Staff guide updated successfully.');
  } catch (err) {
    console.error('Failed to post staff guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
