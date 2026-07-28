const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { findExecutor } = require('../utils/auditLog');

module.exports = {
  name: Events.GuildUpdate,
  once: false,
  async execute(oldGuild, newGuild) {
    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`);
    if (oldGuild.iconURL() !== newGuild.iconURL()) changes.push('**Server icon changed**');
    if (!changes.length) return;

    try {
      const executor = await findExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
      const logChannel = await newGuild.client.channels.fetch(config.channels.serverLogs);
      const embed = baseEmbed(newGuild.client, {
        color: THEME.colors.warning,
        title: '🌐 Server Settings Updated',
        description: `**Changed by:** ${executor ? executor.tag : 'Unknown'}\n\n${changes.join('\n')}`,
        thumbnail: newGuild.iconURL({ size: 256 }) || undefined,
      });
      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to log guild update:', err);
    }
  },
};
