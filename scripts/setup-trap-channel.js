const { Client, GatewayIntentBits, Events, PermissionsBitField, ChannelType } = require('discord.js');
const config = require('../src/config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const verifyChannel = await client.channels.fetch(config.channels.verify);
    const guild = verifyChannel.guild;
    const category = verifyChannel.parent;

    const trapChannel = await guild.channels.create({
      name: 'server-info',
      type: ChannelType.GuildText,
      parent: category ? category.id : null,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        {
          id: config.roles.unverified,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        { id: config.roles.member, deny: [PermissionsBitField.Flags.ViewChannel] },
      ],
    });

    console.log(`Trap channel created: #${trapChannel.name}`);
    console.log(`Channel ID: ${trapChannel.id}`);
    console.log('Copy this ID — you need to add it as TRAP_CHANNEL_ID next.');
  } catch (err) {
    console.error('Failed to create trap channel:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
