const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { THEME, baseEmbed } = require('../utils/embeds');
const { hasRank, RANKS } = require('../utils/permissions');
const {
  createTask,
  setTaskMessage,
  getTask,
  claimTask,
  completeTask,
  cancelTask,
  addTaskClaim,
  getTaskClaims,
  hasUserClaimedTask,
} = require('../database/db');

const pending = new Map();

function buildTaskFields(task, extra) {
  return [
    { name: 'Assigned To', value: task.assigned_role_id ? `<@&${task.assigned_role_id}>` : 'Any staff member', inline: true },
    { name: 'Deadline', value: task.deadline ? `<t:${Math.floor(new Date(task.deadline).getTime() / 1000)}:R>` : 'No deadline', inline: true },
    { name: 'Claim Mode', value: task.allow_multiple_claims ? 'Multiple people can claim' : 'Single claimer only', inline: true },
    ...(extra || []),
  ];
}

async function startTaskFlow(interaction) {
  const title = interaction.options.getString('title');
  const description = interaction.options.getString('description');
  const assignRole = interaction.options.getRole('assign_role');
  const deadlineMinutes = interaction.options.getInteger('deadline_minutes');
  const allowMultipleClaims = interaction.options.getBoolean('allow_multiple_claims') || false;
  const deadline = deadlineMinutes ? new Date(Date.now() + deadlineMinutes * 60000).toISOString() : null;

  pending.set(interaction.user.id, { title, description, assignedRoleId: assignRole ? assignRole.id : null, deadline, allowMultipleClaims });

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.warning,
    title: `📋 ${title}`,
    description,
    fields: [
      { name: 'Assigned To', value: assignRole ? assignRole.toString() : 'Any staff member', inline: true },
      { name: 'Deadline', value: deadline ? `<t:${Math.floor(new Date(deadline).getTime() / 1000)}:R>` : 'No deadline', inline: true },
      { name: 'Claim Mode', value: allowMultipleClaims ? 'Multiple people can claim' : 'Single claimer only', inline: true },
    ],
  });

  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder().setCustomId('task_channel_select').setPlaceholder('Select a channel to post this task in').setChannelTypes(ChannelType.GuildText)
  );

  await interaction.reply({ content: 'Preview — select where to post this task.', embeds: [embed], components: [row], ephemeral: true });
}

async function handleChannelSelect(interaction) {
  const data = pending.get(interaction.user.id);
  if (!data) return interaction.update({ content: 'This session expired — run `/task` again.', embeds: [], components: [] });

  const channel = await interaction.client.channels.fetch(interaction.values[0]).catch(() => null);
  if (!channel) return interaction.update({ content: 'Could not find that channel.', embeds: [], components: [] });

  const taskId = createTask({
    title: data.title,
    description: data.description,
    assignedRoleId: data.assignedRoleId,
    deadline: data.deadline,
    createdBy: interaction.user.id,
    allowMultipleClaims: data.allowMultipleClaims,
  });

  const task = getTask(taskId);
  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.warning,
    title: `📋 ${data.title}`,
    description: data.description,
    fields: buildTaskFields(task, [{ name: 'Status', value: '🟡 Open — waiting to be claimed' }]),
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`task_claim_${taskId}`).setLabel('Claim Task').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`task_cancel_${taskId}`).setLabel('Cancel Task').setEmoji('✖️').setStyle(ButtonStyle.Danger)
  );

  const pingContent = data.assignedRoleId ? `<@&${data.assignedRoleId}>` : '';
  const sentMessage = await channel.send({
    content: pingContent || undefined,
    embeds: [embed],
    components: [row],
    allowedMentions: { roles: data.assignedRoleId ? [data.assignedRoleId] : [] },
  });

  setTaskMessage(taskId, channel.id, sentMessage.id);
  pending.delete(interaction.user.id);
  await interaction.update({ content: `Task posted in ${channel}.`, embeds: [], components: [] });
}

async function handleClaim(interaction) {
  const taskId = parseInt(interaction.customId.replace('task_claim_', ''), 10);
  const task = getTask(taskId);
  if (!task) return interaction.reply({ content: 'Task not found.', ephemeral: true });

  const isManager = hasRank(interaction.member, RANKS.MANAGER);
  const hasAssignedRole = task.assigned_role_id ? interaction.member.roles.cache.has(task.assigned_role_id) : hasRank(interaction.member, RANKS.TRIAL_STAFF);
  if (!isManager && !hasAssignedRole) {
    return interaction.reply({ content: 'You are not eligible to claim this task.', ephemeral: true });
  }

  if (task.allow_multiple_claims) {
    if (task.status === 'cancelled' || task.status === 'done') {
      return interaction.reply({ content: 'This task is no longer open.', ephemeral: true });
    }
    const added = addTaskClaim(taskId, interaction.user.id);
    if (!added) {
      return interaction.reply({ content: "You've already claimed this task.", ephemeral: true });
    }

    const claimers = getTaskClaims(taskId);
    const embed = baseEmbed(interaction.client, {
      color: THEME.colors.primary,
      title: `📋 ${task.title}`,
      description: task.description,
      fields: buildTaskFields(task, [
        { name: `Claimed By (${claimers.length})`, value: claimers.map((c) => `<@${c.user_id}>`).join(', ') },
      ]),
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`task_claim_${taskId}`).setLabel('Claim Task').setEmoji('🙋').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`task_done_${taskId}`).setLabel('Mark as Done').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`task_cancel_${taskId}`).setLabel('Cancel Task').setEmoji('✖️').setStyle(ButtonStyle.Danger)
    );

    return interaction.update({ embeds: [embed], components: [row] });
  }

  if (task.status !== 'open') {
    return interaction.reply({ content: 'This task has already been claimed or is no longer open.', ephemeral: true });
  }

  claimTask(taskId, interaction.user.id);

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.primary,
    title: `📋 ${task.title}`,
    description: task.description,
    fields: buildTaskFields(task, [{ name: 'Status', value: `🔵 In progress — claimed by ${interaction.user.tag}` }]),
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`task_done_${taskId}`).setLabel('Mark as Done').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`task_cancel_${taskId}`).setLabel('Cancel Task').setEmoji('✖️').setStyle(ButtonStyle.Danger)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

async function handleDone(interaction) {
  const taskId = parseInt(interaction.customId.replace('task_done_', ''), 10);
  const task = getTask(taskId);
  if (!task) return interaction.reply({ content: 'Task not found.', ephemeral: true });

  const isManager = hasRank(interaction.member, RANKS.MANAGER);
  const isClaimer = task.allow_multiple_claims ? hasUserClaimedTask(taskId, interaction.user.id) : task.claimed_by === interaction.user.id;
  if (!isManager && !isClaimer) {
    return interaction.reply({ content: 'Only someone who claimed this task or a Manager can mark it done.', ephemeral: true });
  }

  completeTask(taskId);

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.success,
    title: `✅ ${task.title} — Completed`,
    description: task.description,
    fields: [{ name: 'Completed By', value: interaction.user.toString() }],
  });

  await interaction.update({ embeds: [embed], components: [] });
}

async function handleCancel(interaction) {
  const taskId = parseInt(interaction.customId.replace('task_cancel_', ''), 10);
  const task = getTask(taskId);
  if (!task) return interaction.reply({ content: 'Task not found.', ephemeral: true });

  if (!hasRank(interaction.member, RANKS.MANAGER)) {
    return interaction.reply({ content: 'Only the Owner or a Manager can cancel a task.', ephemeral: true });
  }

  cancelTask(taskId);

  const embed = baseEmbed(interaction.client, {
    color: THEME.colors.danger,
    title: `✖️ ${task.title} — Cancelled`,
    description: task.description,
    fields: [{ name: 'Cancelled By', value: interaction.user.toString() }],
  });

  await interaction.update({ embeds: [embed], components: [] });
}

module.exports = { startTaskFlow, handleChannelSelect, handleClaim, handleDone, handleCancel };
