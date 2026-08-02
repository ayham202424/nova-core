const { Events, AuditLogEvent } = require('discord.js');
const config = require('../config');
const { THEME, baseEmbed } = require('../utils/embeds');
const { checkForAbuse } = require('../utils/abuseDetection');
const { incrementBanCount, incrementKickCount } = require('../database/db');
const { buildAppealRow } = require('../utils/moderationDM');

module.exports = {
  name: Events.GuildAuditLogEntryCreate,
  once: false,
  async execute(entry, guild) {
    const client = guild.client;

    try {
      switch (entry.action) {
        case AuditLogEvent.RoleCreate: {
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.success,
                title: '➕ Role Created',
                description: `**Role:** \`${entry.target?.name || 'Unknown'}\`\n**Created by:** ${entry.executor?.tag || 'Unknown'}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.RoleDelete: {
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.danger,
                title: '➖ Role Deleted',
                description: `**Role:** \`${entry.target?.name || 'Unknown'}\`\n**Deleted by:** ${entry.executor?.tag || 'Unknown'}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.RoleUpdate: {
          const nameChange = entry.changes?.find((c) => c.key === 'name');
          const colorChange = entry.changes?.find((c) => c.key === 'color');
          if (!nameChange && !colorChange) break;
          const lines = [];
          if (nameChange) lines.push(`**Name:** ${nameChange.old} → ${nameChange.new}`);
          if (colorChange) lines.push('**Color changed**');
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.warning,
                title: '✏️ Role Updated',
                description: `**Role:** \`${entry.target?.name || 'Unknown'}\`\n**Updated by:** ${entry.executor?.tag || 'Unknown'}\n\n${lines.join('\n')}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.ChannelCreate: {
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.success,
                title: '➕ Channel Created',
                description: `**Channel:** \`#${entry.target?.name || 'Unknown'}\`\n**Created by:** ${entry.executor?.tag || 'Unknown'}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.ChannelDelete: {
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.danger,
                title: '➖ Channel Deleted',
                description: `**Channel:** \`#${entry.target?.name || 'Unknown'}\`\n**Deleted by:** ${entry.executor?.tag || 'Unknown'}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.ChannelUpdate: {
          const nameChange = entry.changes?.find((c) => c.key === 'name');
          if (!nameChange) break;
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.warning,
                title: '✏️ Channel Renamed',
                description: `**Before:** \`#${nameChange.old}\`\n**After:** \`#${nameChange.new}\`\n**Changed by:** ${entry.executor?.tag || 'Unknown'}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.MemberRoleUpdate: {
          const addChange = entry.changes?.find((c) => c.key === '$add');
          const removeChange = entry.changes?.find((c) => c.key === '$remove');
          if (!addChange && !removeChange) break;
          const lines = [];
          if (addChange?.new?.length) lines.push(`**Added:** ${addChange.new.map((r) => `<@&${r.id}>`).join(', ')}`);
          if (removeChange?.new?.length) lines.push(`**Removed:** ${removeChange.new.map((r) => `<@&${r.id}>`).join(', ')}`);
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.warning,
                title: '🎭 Member Roles Updated',
                description: `**Member:** <@${entry.targetId}>\n**Changed by:** ${entry.executor?.tag || 'Unknown'}\n\n${lines.join('\n')}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.MemberUpdate: {
          const nickChange = entry.changes?.find((c) => c.key === 'nick');
          const timeoutChange = entry.changes?.find((c) => c.key === 'communication_disabled_until');

          if (nickChange) {
            const logChannel = await client.channels.fetch(config.channels.serverLogs);
            await logChannel.send({
              embeds: [
                baseEmbed(client, {
                  color: THEME.colors.warning,
                  title: '📝 Nickname Changed',
                  description:
                    `**Member:** <@${entry.targetId}>\n**Changed by:** ${entry.executor?.tag || 'Unknown'}\n` +
                    `**Before:** ${nickChange.old || '*none*'}\n**After:** ${nickChange.new || '*none*'}`,
                }),
              ],
            });
          }

          if (timeoutChange && entry.executorId !== client.user.id) {
            const isNowTimedOut = timeoutChange.new && new Date(timeoutChange.new).getTime() > Date.now();
            const logChannel = await client.channels.fetch(config.channels.cmdsLogs);
            await logChannel.send({
              embeds: [
                baseEmbed(client, {
                  color: isNowTimedOut ? THEME.colors.danger : THEME.colors.success,
                  title: isNowTimedOut ? '⏱️ Member Timed Out (External)' : '✅ Timeout Removed (External)',
                  description:
                    `**Member:** <@${entry.targetId}>\n**By:** ${entry.executor?.tag || 'Unknown'}` +
                    (isNowTimedOut ? `\n**Expires:** <t:${Math.floor(new Date(timeoutChange.new).getTime() / 1000)}:F>` : ''),
                }),
              ],
            });
          }
          break;
        }

        case AuditLogEvent.MemberKick: {
          if (entry.executorId === client.user.id) break;

          incrementKickCount(entry.targetId);

          const logChannel = await client.channels.fetch(config.channels.cmdsLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.danger,
                title: '👢 Member Kicked (External)',
                description:
                  `**User:** <@${entry.targetId}> (\`${entry.targetId}\`)\n**Kicked by:** ${entry.executor?.tag || 'Unknown'}\n**Reason:** ${entry.reason || 'No reason provided'}\n\n` +
                  "_Not issued through `/kick` — done via Discord's native tools or another bot._",
              }),
            ],
          });

          if (entry.target) {
            try {
              const dmEmbed = baseEmbed(client, {
                color: THEME.colors.danger,
                title: '👢 You Have Been Kicked',
                description: `You have been kicked from **Nova-Creations**.\n\n**Reason:** ${entry.reason || 'No reason provided'}`,
              });
              await entry.target.send({ embeds: [dmEmbed], components: [buildAppealRow('kick')] });
            } catch (err) {
              // DMs closed
            }
          }

          if (entry.executor) {
            const moderatorMember = await guild.members.fetch(entry.executor.id).catch(() => null);
            await checkForAbuse(client, guild, moderatorMember, 'kick');
          }
          break;
        }

        case AuditLogEvent.MemberBanAdd: {
          if (entry.executorId === client.user.id) break;

          incrementBanCount(entry.targetId);

          const logChannel = await client.channels.fetch(config.channels.cmdsLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.danger,
                title: '🔨 Member Banned (External)',
                description:
                  `**User:** <@${entry.targetId}> (\`${entry.targetId}\`)\n**Banned by:** ${entry.executor?.tag || 'Unknown'}\n**Reason:** ${entry.reason || 'No reason provided'}\n\n` +
                  "_Not issued through `/ban` — done via Discord's native tools or another bot._",
              }),
            ],
          });

          if (entry.target) {
            try {
              const dmEmbed = baseEmbed(client, {
                color: THEME.colors.danger,
                title: '🔨 You Have Been Banned',
                description: `You have been banned from **Nova-Creations**.\n\n**Reason:** ${entry.reason || 'No reason provided'}`,
              });
              await entry.target.send({ embeds: [dmEmbed], components: [buildAppealRow('ban')] });
            } catch (err) {
              // DMs closed
            }
          }

          if (entry.executor) {
            const moderatorMember = await guild.members.fetch(entry.executor.id).catch(() => null);
            await checkForAbuse(client, guild, moderatorMember, 'ban');
          }
          break;
        }

        case AuditLogEvent.MemberBanRemove: {
          if (entry.executorId === client.user.id) break;
          const logChannel = await client.channels.fetch(config.channels.cmdsLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.success,
                title: '🕊️ Member Unbanned (External)',
                description:
                  `**User:** <@${entry.targetId}> (\`${entry.targetId}\`)\n**Unbanned by:** ${entry.executor?.tag || 'Unknown'}\n\n` +
                  "_Not issued through `/unban` — done via Discord's native tools or another bot._",
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.EmojiCreate: {
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.success,
                title: '😀 Emoji Added',
                description: `**Emoji:** \`:${entry.target?.name || 'unknown'}:\`\n**Added by:** ${entry.executor?.tag || 'Unknown'}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.EmojiDelete: {
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.danger,
                title: '🗑️ Emoji Removed',
                description: `**Emoji:** \`:${entry.target?.name || 'unknown'}:\`\n**Removed by:** ${entry.executor?.tag || 'Unknown'}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.GuildUpdate: {
          const nameChange = entry.changes?.find((c) => c.key === 'name');
          const iconChange = entry.changes?.find((c) => c.key === 'icon_hash');
          if (!nameChange && !iconChange) break;
          const lines = [];
          if (nameChange) lines.push(`**Name:** ${nameChange.old} → ${nameChange.new}`);
          if (iconChange) lines.push('**Server icon changed**');
          const logChannel = await client.channels.fetch(config.channels.serverLogs);
          await logChannel.send({
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.warning,
                title: '🌐 Server Settings Updated',
                description: `**Changed by:** ${entry.executor?.tag || 'Unknown'}\n\n${lines.join('\n')}`,
              }),
            ],
          });
          break;
        }

        case AuditLogEvent.MessageDelete: {
          if (entry.executorId === client.user.id) break;

          const protectedChannels = [
            config.channels.messageLogs,
            config.channels.serverLogs,
            config.channels.cmdsLogs,
            config.channels.userLogs,
            config.channels.staffGuide,
            config.channels.cmdsGuide,
            config.channels.help,
            config.channels.supportTicketLogs,
            config.channels.supportPanel,
          ];
          const channelId = entry.extra?.channel?.id || entry.extra?.channelId;
          if (!channelId || !protectedChannels.includes(channelId)) break;

          const logChannel = await client.channels.fetch(config.channels.cmdsLogs);
          const managerPing = config.roles.manager ? `<@&${config.roles.manager}>` : '';
          const owner = await guild.fetchOwner().catch(() => null);

          await logChannel.send({
            content: `${managerPing} ${owner ? owner.toString() : ''}`.trim(),
            embeds: [
              baseEmbed(client, {
                color: THEME.colors.danger,
                title: '🚨 SECURITY ALERT — Deletion in Protected Channel',
                description:
                  `**Someone deleted a message in** <#${channelId}> **, a read-only log/guide channel.**\n\n` +
                  `**Deleted by:** ${entry.executor?.tag || 'Unknown'} (\`${entry.executorId}\`)\n\n` +
                  'Treated as a potential attempt to tamper with server records.',
              }),
            ],
          });

          if (entry.executor) {
            try {
              const executorMember = await guild.members.fetch(entry.executor.id).catch(() => null);
              if (executorMember) {
                await executorMember.timeout(15 * 60 * 1000, 'Deleted content in a protected log/guide channel');
              }
            } catch (err) {
              console.error('Could not timeout log-tamper suspect (likely the owner):', err);
            }
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error(`Failed to process audit log entry (action ${entry.action}):`, err);
    }
  },
};
