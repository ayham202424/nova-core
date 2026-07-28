async function findExecutor(guild, auditLogType, targetId) {
  try {
    const logs = await guild.fetchAuditLogs({ type: auditLogType, limit: 5 });
    const entry = logs.entries.find(
      (e) => e.target?.id === targetId && Date.now() - e.createdTimestamp < 10000
    );
    return entry ? entry.executor : null;
  } catch (err) {
    console.error('Failed to fetch audit logs:', err);
    return null;
  }
}

module.exports = { findExecutor };
