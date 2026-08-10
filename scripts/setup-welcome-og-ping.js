const { Client, GatewayIntentBits, Events, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { setBotState } = require('../src/database/db');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const guild = client.guilds.cache.get(config.guildId);

    const welcomeChannel = await guild.channels.create({
      name: '👋-welcome',
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages],
        },
      ],
    });
    setBotState('welcome_channel_id', welcomeChannel.id);
    console.log(`Welcome channel created: #${welcomeChannel.name}`);

    const ogRole = await guild.roles.create({
      name: '🌟 OG Member',
      color: 0xf5c451,
      hoist: true,
      mentionable: false,
    });
    setBotState('og_member_role_id', ogRole.id);
    console.log(`OG Member role created: ${ogRole.name}`);

    const pingRole = await guild.roles.create({
      name: '🗳️ Suggestions + Creation Pings',
      mentionable: true,
    });
    setBotState('creations_suggestions_ping_role_id', pingRole.id);
    console.log(`Ping role created: ${pingRole.name}`);

    console.log('All saved automatically — no further setup needed.');
  } catch (err) {
    console.error('Failed to run welcome/OG/ping setup:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
