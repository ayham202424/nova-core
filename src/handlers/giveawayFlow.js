const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { getOrCreateUser, createGiveaway, setGiveawayMessage, getGiveaway, addGiveawayEntry, hasEnteredGiveaway } = require('../database/db');
const { getThreatLevel } = require('../utils/threatLevel');

const pending = new Map();

function requirementText(type, value) {
  if (type === 'level') return `Minimum Level ${value}`;
  if (type === 'invites') return `Invite ${value}+ people who join the server`;
  return 'Anyone can enter!';
}

async function startGiveawayFlow(interaction) {
  const title = interaction.options.getString('title');
  const prize = interaction.options.getString('prize');
  const durationMinutes = interaction.options.getInteger('duration_minutes');
  const winnerCount = interaction.options.getInteger('winner_count');
  const requirementType = interaction.options.getString('requirement');
  const requirementValue = interaction.options.getInteger('requirement_value');
  const banner = interaction.options.getAttachment('banner');

  if (requirementType !== 'none' && !requirementValue) {
    return interaction.reply({ content: 'Please provide a `requirement_value` for this requirement type.', ephemeral: true });
  }

  const endTime = new Date(Date.now() + durationMinutes * 60000).toISOString();

  pending.set(interaction.user.id, {
    title,
    prize,
    durationMinutes,
    winnerCount,
    requirementType,
    requirementValue: requirementValue || null,
    endTime,
    bannerUrl: banner ? banner.url : null,
  });

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.primary,
    title: `🎉 ${title}`,
    description: `**Prize:** ${prize}\n**Requirement:** ${requirementText(requirementType, requirementValue)}\n**Winners:** ${winnerCount}\n**Ends:** <t:${Math.floor(new Date(endTime).getTime() / 1000)}:R>`,
    image: banner ? banner.url : null,
  });

  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder().setCustomId('giveaway_channel_select').setPlaceholder('Select a channel to post this giveaway in').setChannelTypes(ChannelType.GuildText)
  );

  await interaction.reply({ content: 'Preview — select where to post this giveaway.', embeds: [embed], components: [row], ephemeral: true });
}

async function handleChannelSelect(interaction) {
  const data = pending.get(interaction.user.id);
  if (!data) return interaction.update({ content: 'This session expired — run `/giveaway` again.', embeds: [], components: [] });

  const channel = await interaction.client.channels.fetch(interaction.values[0]).catch(() => null);
  if (!channel) return interaction.update({ content: 'Could not find that channel.', embeds: [], components: [] });

  const giveawayId = createGiveaway({
    title: data.title,
    prize: data.prize,
    requirementType: data.requirementType,
    requirementValue: data.requirementValue,
    winnerCount: data.winnerCount,
    endTime: data.endTime,
    createdBy: interaction.user.id,
  });

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.primary,
    title: `🎉 ${data.title}`,
    description:
      `**Prize:** ${data.prize}\n**Requirement:** ${requirementText(data.requirementType, data.requirementValue)}\n` +
      `**Winners:** ${data.winnerCount}\n**Ends:** <t:${Math.floor(new Date(data.endTime).getTime() / 1000)}:R>\n\nClick below to enter!`,
    image: data.bannerUrl,
    fields: [{ name: 'Giveaway ID', value: `#${giveawayId}` }],
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`giveaway_enter_${giveawayId}`).setLabel('Enter Giveaway').setEmoji('🎉').setStyle(ButtonStyle.Success)
  );

  const pingRoleId = config.pingRoles.giveaway;
  const sentMessage = await channel.send({
    content: pingRoleId ? `<@&${pingRoleId}>` : undefined,
    embeds: [embed],
    components: [row],
    allowedMentions: { roles: pingRoleId ? [pingRoleId] : [] },
  });

  setGiveawayMessage(giveawayId, channel.id, sentMessage.id);
  pending.delete(interaction.user.id);
  await interaction.update({ content: `Giveaway #${giveawayId} posted in ${channel}.`, embeds: [], components: [] });
}

async function handleEnterClick(interaction) {
  const giveawayId = parseInt(interaction.customId.replace('giveaway_enter_', ''), 10);
  const giveaway = getGiveaway(giveawayId);
  if (!giveaway || giveaway.status !== 'active') {
    return interaction.reply({ content: 'This giveaway has ended.', ephemeral: true });
  }

  const threat = getThreatLevel(interaction.user.id);
  if (threat.label === 'High Risk') {
    return interaction.reply({
      content: 'Your account is currently flagged for repeated violations, so you cannot enter giveaways right now. Keep a clean record to regain access.',
      ephemeral: true,
    });
  }

  if (hasEnteredGiveaway(giveawayId, interaction.user.id)) {
    return interaction.reply({ content: "You're already entered in this giveaway. Good luck! 🍀", ephemeral: true });
  }

  const user = getOrCreateUser(interaction.user.id);

  if (giveaway.requirement_type === 'level' && user.level < giveaway.requirement_value) {
    return interaction.reply({
      content: `You need to be **Level ${giveaway.requirement_value}** to enter. You're currently **Level ${user.level}**.`,
      ephemeral: true,
    });
  }

  if (giveaway.requirement_type === 'invites' && (user.invites_count || 0) < giveaway.requirement_value) {
    return interaction.reply({
      content: `You need **${giveaway.requirement_value}** invites to enter. You currently have **${user.invites_count || 0}**. Invite more people who join the server to qualify!`,
      ephemeral: true,
    });
  }

  addGiveawayEntry(giveawayId, interaction.user.id);
  await interaction.reply({ content: "🎉 You're entered! Good luck!", ephemeral: true });
}

module.exports = { startGiveawayFlow, handleChannelSelect, handleEnterClick };
