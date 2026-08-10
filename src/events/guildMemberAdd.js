const { Events } = require('discord.js');
const config = require('../config');
const {
  getOrCreateUser,
  incrementInvites,
  incrementJoinCount,
  setOgMember,
  isOgMember,
  createInviteRecord,
  getBotState,
} = require('../database/db');
const { THEME, baseEmbed } = require('../utils/embeds');
const { resolveInviterOnJoin } = require('../utils/inviteTracker');
const { updateMemberCountChannel } = require('../utils/memberCountManager');
const { getWelcomeText, getRejoinText } = require('../utils/welcomeMessages');

const OG_MEMBER_LIMIT = 100;
const SUSPICIOUS_REJOIN_THRESHOLD = 3;

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member) {
    try {
      getOrCreateUser(member.id);
      if (config.roles.unverified) {
        await member.roles.add(config.roles.unverified);
      }
    } catch (err) {
      console.error(`Failed to assign Unverified role to ${member.user.tag}:`, err);
    }

    updateMemberCountChannel(member.client).catch((err) => console.error('Member count update failed:', err));

    const joinCount = incrementJoinCount(member.id);
    const isRejoin = joinCount > 1;

    let inviterId = null;
    try {
      inviterId = await resolveInviterOnJoin(member.guild);
      if (inviterId && inviterId !== member.id) {
        incrementInvites(inviterId);
        createInviteRecord(inviterId, member.id);
      }
    } catch (err) {
      console.error('Failed to resolve inviter:', err);
    }

    const ogRoleId = getBotState('og_member_role_id');
    if (ogRoleId) {
      try {
        if (isOgMember(member.id)) {
          await member.roles.add(ogRoleId);
        } else if (!isRejoin && member.guild.memberCount <= OG_MEMBER_LIMIT) {
          await member.roles.add(ogRoleId);
          setOgMember(member.id);
        }
      } catch (err) {
        console.error('Failed to assign OG Member role:', err);
      }
    }

    let dmSent = true;
    try {
      const verifyChannelLink = `https://discord.com/channels/${member.guild.id}/${config.channels.verify}`;
      const welcomeEmbed = baseEmbed(member.client, {
        color: THEME.colors.primary,
        authorName: 'Nova-Creations',
        authorIcon: member.guild.iconURL({ size: 256 }) || undefined,
        title: '🌙 Welcome to Nova-Creations',
        description:
          `Hey ${member.user.username}, thanks for joining!\n\n` +
          'Before you can see and use the rest of the server, you need to **verify yourself**.\n\n' +
          `👉 Head over to **[the verification channel](${verifyChannelLink})** and click **Accept & Enter** after reading the rules.`,
      });
      await member.send({ embeds: [welcomeEmbed] });
    } catch (err) {
      dmSent = false;
    }

    const welcomeChannelId = getBotState('welcome_channel_id');
    if (welcomeChannelId) {
      try {
        const welcomeChannel = await member.client.channels.fetch(welcomeChannelId);
        const text = isRejoin ? getRejoinText(member.toString()) : getWelcomeText(member.toString(), member.guild.memberCount);

        const fields = [
          { name: 'Been here before?', value: isRejoin ? `Yes — joined ${joinCount} times` : 'First time here!', inline: true },
          { name: 'Invited By', value: inviterId ? `<@${inviterId}>` : 'Unknown', inline: true },
        ];
        if (isOgMember(member.id)) fields.push({ name: 'Status', value: '🌟 OG Member' });

        const embed = baseEmbed(member.client, {
          color: THEME.colors.primary,
          title: text,
          fields,
          thumbnail: member.user.displayAvatarURL({ size: 128 }),
        });

        await welcomeChannel.send({ content: member.toString(), embeds: [embed], allowedMentions: { users: [member.id] } });
      } catch (err) {
        console.error('Failed to post welcome message:', err);
      }
    }

    if (joinCount >= SUSPICIOUS_REJOIN_THRESHOLD) {
      try {
        const logChannel = await member.client.channels.fetch(config.channels.cmdsLogs);
        const pingRoleIds = [config.roles.staff, config.roles.mod, config.roles.manager].filter(Boolean);
        const embed = baseEmbed(member.client, {
          color: THEME.colors.warning,
          authorName: member.user.tag,
          authorIcon: member.user.displayAvatarURL(),
          title: '🔁 Suspicious Rejoin Pattern',
          description: `${member} has joined the server **${joinCount} times**. Might be worth keeping an eye on.`,
        });
        await logChannel.send({
          content: pingRoleIds.map((id) => `<@&${id}>`).join(' '),
          embeds: [embed],
          allowedMentions: { roles: pingRoleIds },
        });
      } catch (err) {
        console.error('Failed to flag suspicious rejoin:', err);
      }
    }

    try {
      const userLogsChannel = await member.client.channels.fetch(config.channels.userLogs);
      const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);

      const embed = baseEmbed(member.client, {
        color: THEME.colors.success,
        authorName: member.user.tag,
        authorIcon: member.user.displayAvatarURL(),
        title: '📥 Member Joined',
        description: `${member} joined the server.`,
        fields: [
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (${accountAgeDays} days ago)` },
          { name: 'User ID', value: `\`${member.id}\`` },
          { name: 'Invited By', value: inviterId ? `<@${inviterId}>` : 'Unknown (vanity URL / expired invite)' },
          { name: 'Join Count', value: `${joinCount}` },
          { name: 'Welcome DM Sent', value: dmSent ? 'Yes ✅' : 'No — DMs closed ❌' },
        ],
        thumbnail: member.user.displayAvatarURL({ size: 256 }),
      });

      await userLogsChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Failed to send join log:', err);
    }
  },
};
