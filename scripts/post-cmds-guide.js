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
    const channel = await client.channels.fetch(config.channels.cmdsGuide);
    await clearOldMessages(channel);

    const intro = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '⚙️ Commands Guide',
      description: 'Every command, what it does, and the minimum rank required to use it.',
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

    const rightClickTools = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Right-Click Proof Tools',
      description:
        'Right-click any message → **Apps** → choose one of the tools below. The clicked message is automatically attached as proof — no manual screenshot needed.',
      fields: [
        { name: 'Warn (use as proof)', value: '**Requires:** Trial Staff+' },
        { name: 'Kick (use as proof)', value: '**Requires:** Staff+' },
        { name: 'Ban (use as proof)', value: '**Requires:** Mod+' },
      ],
    });

    const managementCommands = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Staff & Management Tools',
      fields: [
        {
          name: '/announcement `title` `message` `color` `banner` `file`',
          value:
            'Creates a formatted announcement. After running the command, choose the target channel and which ping role(s) to notify ' +
            '(or override with "Ping Everyone"), then confirm before it sends. **Requires:** Manager+',
        },
        {
          name: '/task `title` `description` `assign_role` `deadline_minutes`',
          value:
            'Posts a claimable task. First eligible person to click "Claim" gets it assigned; the claimer or a Manager can mark it done, ' +
            'a Manager can cancel it anytime. **Requires:** Manager+',
        },
      ],
    });

    const notes = baseEmbed(client, {
      color: THEME.colors.warning,
      title: 'Good to Know',
      description:
        '✦ Every moderation command logs automatically to the Cmds Logs channel — no manual logging needed.\n' +
        '✦ The affected user is always DMed automatically with the reason and proof.\n' +
        '✦ You cannot moderate someone of equal or higher rank than you.\n' +
        '✦ Run `/help` anywhere for a quick on-demand summary of everything above.\n' +
        '✦ This guide updates as new systems (leveling, ban appeals) are added.',
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [modCommands] });
    await channel.send({ embeds: [rightClickTools] });
    await channel.send({ embeds: [managementCommands] });
    await channel.send({ embeds: [notes] });
    console.log('Cmds guide updated successfully.');
  } catch (err) {
    console.error('Failed to post cmds guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
