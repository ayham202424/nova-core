async function getOwnerPingContent(guild) {
  try {
    const owner = await guild.fetchOwner();
    return { content: owner.toString(), ownerId: owner.id };
  } catch (err) {
    return { content: '', ownerId: null };
  }
}

module.exports = { getOwnerPingContent };
