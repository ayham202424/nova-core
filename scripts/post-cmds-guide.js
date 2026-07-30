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
      description: 'Right-click any message → **Apps** → choose a tool. The clicked message is automatically attached as proof.',
      fields: [
        { name: 'Warn (use as proof)', value: '**Requires:** Trial Staff+' },
        { name: 'Kick (use as proof)', value: '**Requires:** Staff+' },
        { name: 'Ban (use as proof)', value: '**Requires:** Mod+' },
      ],
    });

    const ticketCommands = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Ticket Management',
      fields: [
        { name: '/reopenticket `ticketid`', value: 'Reopens a closed support ticket with its full past chat history attached as a file. A "Reopen" button is also available directly on every entry in support-ticket-logs. **Requires:** Staff+' },
        { name: '/restoreticket `ticketid`', value: 'Quickly view a ticket\'s full transcript as a file, without reopening a channel. **Requires:** Staff+' },
      ],
    });

    const managementCommands = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Staff & Management Tools',
      fields: [
        { name: '/announcement `title` `message` `color` `banner` `file`', value: 'Creates a formatted announcement with channel & ping selection. **Requires:** Manager+' },
        { name: '/task `title` `description` `assign_role` `deadline_minutes`', value: 'Posts a claimable task for staff/developers. **Requires:** Manager+' },
      ],
    });

    const autoSystems = baseEmbed(client, {
      color: THEME.colors.warning,
      title: 'Automated Security Systems',
      description:
        '✦ **Spam protection:** 4+ messages in 5 seconds → first offense in 24h gets a 30-second cooldown with a warning DM (no formal warn). ' +
        'If it happens again within 24 hours, real escalating warns kick in.\n' +
        '✦ **Language filter:** prohibited words are automatically removed and result in a warn, same escalation as manual warns.\n' +
        '✦ **Suspicious activity flags:** users automatically get flagged here with full context once they reach 3, 5, 8, or 12 total warnings.\n' +
        '✦ Every moderation action logs automatically — no manual logging needed. Run `/help` anywhere for a quick summary.',
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [modCommands] });
    await channel.send({ embeds: [rightClickTools] });
    await channel.send({ embeds: [ticketCommands] });
    await channel.send({ embeds: [managementCommands] });
    await channel.send({ embeds: [autoSystems] });
    console.log('Cmds guide updated successfully.');
  } catch (err) {
    console.error('Failed to post cmds guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
