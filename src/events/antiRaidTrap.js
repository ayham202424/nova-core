const { Events } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (message.author.bot) return;
    if (!config.channels.trapChannel) return;
    if (message.channelId !== config.channels.trapChannel) return;

    const guild = message.guild;
    const author = message.author;

    try {
      await message.delete();
    } catch (err) {
      // ignore
    }

    let deletedCount = 0;
    try {
      const oneMinuteAgo = Date.now() - 60000;
      const channels = guild.channels.cache.filter((c) => c.isTextBased() && c.viewable);
      for (const [, channel] of channels) {
        try {
          const recentMessages = await channel.messages.fetch({ limit: 50 });
          const toDelete = recentMessages.filter(
            (m) => m.author.id === author.id && m.createdTimestamp > oneMinuteAgo
          );
          if (toDelete.size > 0) {
            await channel.bulkDelete(toDelete, true);
            deletedCount += toDelete.size;
          }
        } catch (err) {
          // skip channels the bot cannot bulk-delete in
        }
      }
    } catch (err) {
      console.error('Failed to clean trap-triggered messages:', err);
    }

    let kicked = true;
    try {
      const member = await guild.members.fetch(author.id);
      await member.kick('Triggered anti-raid trap channel');
    } catch (err) {
      kicked = false;
    }

    try {
      const logChannel = await message.client.channels.fetch(config.channels.cmdsLogs);
      const managerPing = config.roles.manager ? `<@&${config.roles.manager}>` : '';
      const owner = await guild.fetchOwner().catch(() => null);

      await logChannel.send({
        content: `${managerPing} ${owner ? owner.toString() : ''}`.trim(),
        embeds: [
          baseEmbed(message.client, {
            color: THEME.colors.danger,
            authorName: author.tag,
            authorIcon: author.displayAvatarURL(),
            title: '🚨 Anti-Raid Trap Triggered',
            description:
              `**User:** ${author} (\`${author.id}\`)\n` +
              `**Action:** ${kicked ? 'Kicked ✅' : 'Kick failed ❌'}\n` +
              `**Messages cleaned server-wide:** ${deletedCount}\n\n` +
              'This user posted in a hidden trap channel — no legitimate member is ever told about it, so this is a strong signal of a raid/self-bot.',
          }),
        ],
      });
    } catch (err) {
      console.error('Failed to log trap trigger:', err);
    }
  },
};
