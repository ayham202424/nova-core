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
    console.error('Failed to clear old rules messages:', err);
  }
}

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.rules);
    await clearOldMessages(channel);

    const intro = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '✦ Nova-Creations Server Rules ✦',
      description: 'Please read carefully — by staying in this server, you agree to follow every rule below.',
    });

    const conduct = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '① General Conduct',
      fields: [
        { name: '1.', value: 'Be respectful — no harassment, hate speech, or discrimination of any kind.' },
        { name: '2.', value: 'No spamming, excessive pinging, or unsolicited DMs to members or staff.' },
        { name: '3.', value: 'No NSFW, gore, or otherwise inappropriate content anywhere in the server.' },
        { name: '4.', value: 'Keep discussions civil — disagreements are fine, insults are not.' },
      ],
    });

    const serverUsage = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '② Server & Channel Usage',
      fields: [
        { name: '5.', value: 'Use channels for their intended purpose (support in the help channels, purchases via tickets, etc.).' },
        { name: '6.', value: 'No advertising other servers, products, or services outside designated channels.' },
        { name: '7.', value: 'English only in public channels, so staff and members can understand and moderate fairly.' },
        { name: '8.', value: 'Do not attempt to bypass timeouts or bans (e.g. alt accounts).' },
      ],
    });

    const marketplace = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '③ Marketplace & Trading',
      fields: [
        { name: '9.', value: 'No sharing, selling, or requesting stolen, leaked, or unauthorized Roblox assets/scripts.' },
        { name: '10.', value: 'All purchases must go through the official ticket system — never trade or pay outside of a ticket.' },
        { name: '11.', value: 'Scamming, impersonation, or fraud of any kind results in an instant, permanent ban.' },
        { name: '12.', value: 'Never share malicious files, links, or scripts in any form — including as a "joke."' },
      ],
    });

    const staffAndReporting = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '④ Staff & Reporting',
      fields: [
        { name: '13.', value: "Staff, Managers, and the Owner's decisions are final — use the appeal/report system if you disagree, don't argue publicly." },
        { name: '14.', value: 'Staff must never misuse their power (e.g. kicking/banning without a valid reason) — abuse results in immediate rank removal.' },
        { name: '15.', value: 'Report rule-breaking or suspicious behavior via a ticket instead of handling it yourself.' },
      ],
    });

    const consequences = baseEmbed(client, {
      color: THEME.colors.warning,
      title: '⑤ Consequences',
      fields: [
        { name: '16.', value: 'Breaking these rules results in a warning, timeout, kick, or ban depending on severity.' },
        { name: '17.', value: 'Repeated violations escalate faster and can lead to a permanent ban.' },
      ],
      description: 'Welcome to the team — glad to have you here! 🌌',
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [conduct] });
    await channel.send({ embeds: [serverUsage] });
    await channel.send({ embeds: [marketplace] });
    await channel.send({ embeds: [staffAndReporting] });
    await channel.send({ embeds: [consequences] });
    console.log('Rules posted successfully.');
  } catch (err) {
    console.error('Failed to post rules:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
