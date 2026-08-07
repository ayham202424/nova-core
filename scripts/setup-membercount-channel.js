const { Client, GatewayIntentBits, Events, ChannelType, PermissionsBitField } = require('discord.js');
const config = require('../src/config');
const { setBotState } = require('../src/database/db');
const { THEME, baseEmbed } = require('../src/utils/embeds');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const guild = client.guilds.cache.get(config.guildId);

    const channel = await guild.channels.create({
      name: '👥-member-count',
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
          deny: [PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    const embed = baseEmbed(client, {
      color: THEME.colors.primary,
      title: '👥 Nova-Creations Member Count',
      description: `**Current Members:** ${guild.memberCount}\n**All-Time Peak:** ${guild.memberCount}`,
    });

    const sentMessage = await channel.send({ embeds: [embed] });

    setBotState('member_count_channel_id', channel.id);
    setBotState('member_count_message_id', sentMessage.id);
    setBotState('member_count_peak', String(guild.memberCount));
    setBotState('member_count_last_update', String(Date.now()));

    console.log(`Member count channel created: #${channel.name}`);
    console.log('Saved automatically — no further setup needed.');
  } catch (err) {
    console.error('Failed to create member count channel:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
