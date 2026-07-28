const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require('discord.js');
const config = require('../src/config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.verify);
    const guild = channel.guild;

    const embed = new EmbedBuilder()
      .setColor(0x1b1a35)
      .setAuthor({
        name: 'Nova-Creations',
        iconURL: guild.iconURL({ size: 256 }) || undefined,
      })
      .setTitle('✦ Verification Required ✦')
      .setDescription(
        'Welcome to **Nova-Creations**. Before the gates open, please read the rules below carefully.\n' +
          'By clicking **Accept**, you confirm that you have read and agree to follow them.'
      )
      .addFields(
        {
          name: '1. Respect Everyone',
          value: 'Treat all members and staff with respect. Harassment, hate speech, and discrimination are not tolerated.',
        },
        {
          name: '2. No Spam or Flooding',
          value: 'Do not spam messages, mentions, or emojis. Repeated violations lead to escalating timeouts.',
        },
        {
          name: '3. No NSFW Content',
          value: 'No NSFW images, videos, links, or text anywhere on this server.',
        },
        {
          name: '4. Purchases Go Through Tickets Only',
          value: 'All purchases (UI, builds, scripts, animations) must go through our official ticket system. Never trade or pay outside of a ticket.',
        },
        {
          name: '5. Staff Decisions Are Final',
          value: 'If you disagree with a staff decision, open an appeal ticket. Do not argue in public channels.',
        },
        {
          name: '6. Warnings & Timeouts',
          value: 'Rule violations result in warnings and automatic timeouts. Repeated offenses escalate in severity over time.',
        },
        {
          name: '7. One Account Per Person',
          value: 'Using alternate accounts to bypass a punishment results in a permanent ban.'
        },
      )
      .setThumbnail(guild.iconURL({ size: 256 }) || null)
      .setFooter({ text: 'Nova-Creations  ✧  Reach for the stars' })
      .setTimestamp();

    if (config.verifyBannerUrl) {
      embed.setImage(config.verifyBannerUrl);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_accept')
        .setLabel('Accept & Enter')
        .setEmoji('🌙')
        .setStyle(ButtonStyle.Success)
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log('Verify message posted successfully.');
  } catch (err) {
    console.error('Failed to post verify message:', err);
  } finally {
    client.destroy();
  }
});

client.login(config.token);
