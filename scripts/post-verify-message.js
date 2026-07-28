const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} = require('discord.js');
const config = require('../src/config');
const { THEME, baseEmbed } = require('../src/utils/embeds');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    const channel = await client.channels.fetch(config.channels.verify);
    const guild = channel.guild;
    const guildIcon = guild.iconURL({ size: 256 }) || undefined;

    const embed = baseEmbed(client, {
      color: THEME.colors.primary,
      authorName: 'Nova-Creations',
      authorIcon: guildIcon,
      title: '✦ Verification Required ✦',
      description:
        'Welcome to **Nova-Creations**. Before the gates open, please read the rules below carefully.\n' +
        'By clicking **Accept**, you confirm that you have read and agree to follow them.',
      fields: [
        { name: '① Respect Everyone', value: 'Treat all members and staff with respect. Harassment, hate speech, and discrimination are not tolerated.' },
        { name: '② No Spam or Flooding', value: 'Do not spam messages, mentions, or emojis. Repeated violations lead to escalating timeouts.' },
        { name: '③ No NSFW Content', value: 'No NSFW images, videos, links, or text anywhere on this server.' },
        { name: '④ Purchases Go Through Tickets Only', value: 'All purchases (UI, builds, scripts, animations) must go through our official ticket system.' },
        { name: '⑤ Staff Decisions Are Final', value: 'If you disagree with a decision, open an appeal ticket instead of arguing publicly.' },
        { name: '⑥ Warnings & Timeouts', value: 'Rule violations result in warnings and automatic timeouts, escalating in severity over time.' },
        { name: '⑦ One Account Per Person', value: 'Using alternate accounts to bypass a punishment results in a permanent ban.' },
      ],
      thumbnail: guildIcon,
      image: config.verifyBannerUrl || null,
    });

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
