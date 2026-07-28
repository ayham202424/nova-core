const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.cmdsGuide);

    const intro = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '⚙️ Commands Guide',
      description: 'Every staff command, what it does, and the minimum rank required to use it.',
    });

    const modCommands = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Moderation Commands',
      fields: [
        { name: '/warn `user` `reason` `proof`', value: 'Warns a user. Timeout severity escalates automatically. **Requires:** Trial Staff+' },
        { name: '/warns `user`', value: "View a member's full warning history. **Requires:** Trial Staff+" },
        { name: '/unwarn `user`', value: 'Remove one warning from a member via dropdown selection. **Requires:** Staff+' },
        { name: '/kick `user` `reason` `proof`', value: 'Kicks a member from the server. **Requires:** Staff+' },
        { name: '/ban `user` `reason` `proof`', value: 'Bans a member from the server. **Requires:** Mod+' },
        { name: '/unban `userid` `reason`', value: 'Unbans a user by their User ID. **Requires:** Mod+' },
        { name: '/clearwarns `user` `reason`', value: "Wipes a member's entire warning history. **Requires:** Head Mod+" },
      ],
    });

    const notes = baseEmbed(client, {
      color: THEME.colors.warning,
      title: 'Good to Know',
      description:
        '✦ Every command logs automatically to the Cmds Logs channel — no manual logging needed.\n' +
        '✦ The affected user is always DMed automatically with the reason and proof.\n' +
        '✦ You cannot moderate someone of equal or higher rank than you.\n' +
        '✦ This guide updates as new systems (tickets, leveling, appeals) are added.',
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [modCommands] });
    await channel.send({ embeds: [notes] });
    console.log('Cmds guide posted successfully.');
  } catch (err) {
    console.error('Failed to post cmds guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
