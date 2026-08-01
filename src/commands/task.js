const { SlashCommandBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { startTaskFlow } = require('../handlers/taskFlow');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('task')
    .setDescription('Create a claimable task for staff or developers (Owner/Manager only).')
    .addStringOption((opt) => opt.setName('title').setDescription('Task title').setRequired(true))
    .addStringOption((opt) => opt.setName('description').setDescription('Task details').setRequired(true))
    .addRoleOption((opt) => opt.setName('assign_role').setDescription('Only members with this role can claim it (optional)').setRequired(false))
    .addIntegerOption((opt) => opt.setName('deadline_minutes').setDescription('Deadline in minutes from now (optional)').setRequired(false))
    .addBooleanOption((opt) =>
      opt.setName('allow_multiple_claims').setDescription('Allow more than one person to claim this task? Default: No (single claimer only)').setRequired(false)
    ),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.MANAGER)) {
      return interaction.reply({ content: 'Only the Owner and Managers can create tasks.', ephemeral: true });
    }
    await startTaskFlow(interaction);
  },
};
