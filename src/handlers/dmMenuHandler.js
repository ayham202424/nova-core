const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const config = require('../config');
const { getOrCreateUser } = require('../database/db');
const { baseEmbed, THEME } = require('../utils/embeds');

async function handleIncomingDM(message) {
  const embed = baseEmbed(message.client, {
    color: THEME.colors.primary,
    authorName: 'Nova Core',
    title: '🌙 Nova Core',
    description:
      "Hey! I'm **Nova Core**, the main bot for **Nova-Creations**. I handle verification, logs, and moderation.\n\n" +
      'What can I help you with?',
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dm_menu_about').setLabel('What is this bot?').setEmoji('ℹ️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dm_menu_myinfo').setLabel('My Info').setEmoji('📋').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dm_menu_status').setLabel('Check My Status').setEmoji('🔍').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('dm_menu_contact').setLabel('Contact Owner').setEmoji('✉️').setStyle(ButtonStyle.Secondary)
  );

  await message.reply({ embeds: [embed], components: [row] });
}

async function handleButton(interaction) {
  const { customId } = interaction;

  if (customId === 'dm_menu_about') {
    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      title: 'About Nova Core',
      description:
        'I am **Nova Core**, one of several bots running Nova-Creations.\n\n' +
        '**I handle:** Verification, server logs, warnings, kicks, and bans.\n' +
        'Other bots on the server handle sales tickets, support tickets, and leveling — ' +
        "if your question is about one of those, ask in the server and staff will point you the right way.",
    });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (customId === 'dm_menu_myinfo') {
    const user = getOrCreateUser(interaction.user.id);
    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      authorName: interaction.user.tag,
      authorIcon: interaction.user.displayAvatarURL(),
      title: 'Your Info',
      description:
        `**Verified:** ${user.verified ? 'Yes ✅' : 'No ❌'}\n` +
        `**Total Warnings:** ${user.warns_count}\n` +
        `**Level:** ${user.level} (${user.xp} XP)\n` +
        `**Messages sent:** ${user.messages_total}\n` +
        `**Tickets opened:** ${user.tickets_opened}`,
    });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (customId === 'dm_menu_status') {
    const guild = interaction.client.guilds.cache.get(config.guildId);
    let statusText;

    try {
      const ban = await guild.bans.fetch(interaction.user.id);
      statusText =
        `🔨 **You are currently banned.**\n**Reason:** ${ban.reason || 'No reason provided'}\n\n` +
        'A full ban appeal system is coming soon — for now, use "Contact Owner" in the previous menu.';
    } catch {
      const member = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (!member) {
        statusText = "You are not currently a member of Nova-Creations, and you're not banned either.";
      } else if (
        member.communicationDisabledUntilTimestamp &&
        member.communicationDisabledUntilTimestamp > Date.now()
      ) {
        statusText = `⏱️ **You are currently timed out.**\nExpires: <t:${Math.floor(
          member.communicationDisabledUntilTimestamp / 1000
        )}:R>`;
      } else {
        statusText = '✅ You are in good standing — no active bans or timeouts.';
      }
    }

    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      title: 'Your Current Status',
      description: statusText,
    });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (customId === 'dm_menu_contact') {
    const modal = new ModalBuilder().setCustomId('dm_contact_owner_modal').setTitle('Message the Owner');
    const input = new TextInputBuilder()
      .setCustomId('dm_contact_owner_content')
      .setLabel('Your message')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    return interaction.showModal(modal);
  }
}

async function handleContactModal(interaction) {
  const content = interaction.fields.getTextInputValue('dm_contact_owner_content');
  const guild = interaction.client.guilds.cache.get(config.guildId);

  try {
    const owner = await guild.fetchOwner();
    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      authorName: interaction.user.tag,
      authorIcon: interaction.user.displayAvatarURL(),
      title: '✉️ New Message via Nova Core',
      description: content,
      fields: [{ name: 'From', value: `${interaction.user} (\`${interaction.user.id}\`)` }],
    });
    await owner.send({ embeds: [embed] });
    await interaction.reply({ content: 'Your message has been sent to the owner.', ephemeral: true });
  } catch (err) {
    console.error('Failed to forward DM to owner:', err);
    await interaction.reply({ content: 'Failed to send your message — please try again later.', ephemeral: true });
  }
}

module.exports = { handleIncomingDM, handleButton, handleContactModal };
