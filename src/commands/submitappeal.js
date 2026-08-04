const { SlashCommandBuilder } = require('discord.js');
const { hasRank, RANKS } = require('../utils/permissions');
const { getOpenAppealByUser, createAppeal } = require('../database/db');
const { postAppealToChannel } = require('../handlers/appealFlow');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('submitappeal')
    .setDescription('Manually log an appeal for someone who could not reach the bot via DM (Head Mod+).')
    .addStringOption((opt) => opt.setName('userid').setDescription("The banned/kicked user's Discord ID").setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Ban or kick appeal')
        .setRequired(true)
        .addChoices({ name: 'Ban', value: 'ban' }, { name: 'Kick', value: 'kick' })
    )
    .addStringOption((opt) => opt.setName('reason').setDescription('What did they tell you? (paraphrase their appeal)').setRequired(true)),

  async execute(interaction) {
    if (!hasRank(interaction.member, RANKS.HEAD_MOD)) {
      return interaction.reply({ content: 'You need at least Head Mod rank to use this command.', ephemeral: true });
    }

    const userId = interaction.options.getString('userid').trim();
    const type = interaction.options.getString('type');
    const reason = interaction.options.getString('reason');

    if (!/^\d{15,25}$/.test(userId)) {
      return interaction.reply({ content: "That doesn't look like a valid Discord User ID (should be a long number, no @ or #).", ephemeral: true });
    }

    const existing = getOpenAppealByUser(userId);
    if (existing) {
      return interaction.reply({ content: `This user already has a pending appeal: #${existing.id}.`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = await interaction.client.users.fetch(userId).catch(() => null);
    const userTag = targetUser ? targetUser.tag : `Unknown User (${userId})`;

    const appealId = createAppeal({
      userId,
      userTag,
      type,
      reason: `${reason}\n\n*(Manually logged by ${interaction.user.tag} — user could not be reached via DM)*`,
    });

    await postAppealToChannel(interaction.client, appealId);

    await interaction.editReply({ content: `Appeal #${appealId} logged for ${userTag}.` });
  },
};
