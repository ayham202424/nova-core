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

    const intro = baseEmbed(client, { color: THEME.colors.primary, title: '⚙️ Commands Guide', description: 'Every command and the minimum rank required.' });

    const modCommands = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Moderation Commands',
      fields: [
        { name: '/warn `user` `reason` `proof`', value: 'Escalating warn. **Requires:** Trial Staff+' },
        { name: '/warns `user`', value: "View warning history. **Requires:** Trial Staff+" },
        { name: '/unwarn `user`', value: 'Remove one warning. **Requires:** Staff+' },
        { name: '/kick `user` `reason` `proof`', value: 'Kick a member. **Requires:** Mod+' },
        { name: '/ban `user` `reason` `proof`', value: 'Ban a member. **Requires:** Head Mod+' },
        { name: '/unban `userid` `reason`', value: 'Unban by User ID. **Requires:** Head Mod+' },
        { name: '/clearwarns `user` `reason`', value: 'Wipe entire warning history. **Requires:** Community Manager+' },
      ],
    });

    const rightClickTools = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Right-Click Proof Tools',
      description: 'Right-click any message → **Apps** → choose a tool. The message is auto-attached as proof.',
      fields: [
        { name: 'Warn (use as proof)', value: '**Requires:** Trial Staff+' },
        { name: 'Kick (use as proof)', value: '**Requires:** Mod+' },
        { name: 'Ban (use as proof)', value: '**Requires:** Head Mod+' },
      ],
    });

    const ticketCommands = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Ticket Management',
      fields: [
        { name: '/reopenticket `ticketid`', value: 'Reopens a closed support ticket with full history attached. Button also on every support-ticket-logs entry. **Requires:** Staff+' },
        { name: '/restoreticket `ticketid`', value: "Quick read-only transcript view. **Requires:** Staff+" },
      ],
    });

    const managementCommands = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Staff & Management Tools',
      fields: [
        { name: '/announcement `title` `message` `color` `banner` `video` `file`', value: 'Formatted announcement with channel & ping selection. Banner = image only, use `video` for playable video files. **Requires:** Manager+' },
        { name: '/task `title` `description` `assign_role` `deadline_minutes` `allow_multiple_claims`', value: 'Claimable task for staff/devs — choose single-claimer or open-to-everyone-eligible. **Requires:** Manager+' },
      ],
    });

    const levelingCommands = baseEmbed(client, {
      color: THEME.colors.primary,
      title: 'Leveling',
      fields: [
        { name: '/userinfo `user`', value: "View level, XP, messages sent, warns, and staff stats. Full details for yourself or Trial Staff+ checking others; limited public info otherwise." },
        { name: 'Ping Settings', value: `Click "Manage My Ping Settings" in <#${config.channels.pingSettings}> — shows exactly what's active for you, privately.` },
      ],
    });

    const autoSystems = baseEmbed(client, {
      color: THEME.colors.warning,
      title: 'Automated Security Systems',
      description:
        '✦ **Spam protection:** 4+ messages in 5s → first offense in 24h gets a 30-second cooldown with a DM warning (no formal warn). Repeat within 24h → real escalating warns.\n' +
        '✦ **Language filter:** prohibited words are auto-removed and issue a warn on the same escalation ladder.\n' +
        '✦ **Suspicious activity flags:** users are automatically flagged here with full context at 3, 5, 8, and 12 total warnings.\n' +
        '✦ **Staff abuse detection:** 3+ kicks/bans by one staff member within an hour auto-locks them and pings leadership.\n' +
        '✦ **Content gates:** links need Level 3+, GIFs Level 5+, files Level 10+ (staff exempt).\n' +
        '✦ Run `/help` anywhere for a quick summary.',
    });

    await channel.send({ embeds: [intro] });
    await channel.send({ embeds: [modCommands] });
    await channel.send({ embeds: [rightClickTools] });
    await channel.send({ embeds: [ticketCommands] });
    await channel.send({ embeds: [managementCommands] });
    await channel.send({ embeds: [levelingCommands] });
    await channel.send({ embeds: [autoSystems] });
    console.log('Cmds guide updated successfully.');
  } catch (err) {
    console.error('Failed to post cmds guide:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
