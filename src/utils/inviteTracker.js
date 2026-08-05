const inviteCache = new Map();

async function initInviteCache(guild) {
  try {
    const invites = await guild.invites.fetch();
    inviteCache.clear();
    invites.forEach((invite) => {
      inviteCache.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter?.id || null });
    });
  } catch (err) {
    console.error('Failed to initialize invite cache:', err);
  }
}

async function resolveInviterOnJoin(guild) {
  try {
    const newInvites = await guild.invites.fetch();
    let usedInvite = null;

    for (const invite of newInvites.values()) {
      const cached = inviteCache.get(invite.code);
      const cachedUses = cached ? cached.uses : 0;
      if ((invite.uses || 0) > cachedUses) {
        usedInvite = invite;
        break;
      }
    }

    inviteCache.clear();
    newInvites.forEach((invite) => {
      inviteCache.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter?.id || null });
    });

    return usedInvite ? usedInvite.inviter?.id || null : null;
  } catch (err) {
    console.error('Failed to resolve inviter:', err);
    return null;
  }
}

module.exports = { initInviteCache, resolveInviterOnJoin };
