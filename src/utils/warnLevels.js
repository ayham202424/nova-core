const WARN_LEVELS = [
  { name: 'Minor Notice I', emoji: '🌠', timeoutMinutes: 1, color: 0xf5c451 },
  { name: 'Minor Notice II', emoji: '🌠', timeoutMinutes: 2, color: 0xf5c451 },
  { name: 'Minor Notice III', emoji: '🌠', timeoutMinutes: 3, color: 0xf5c451 },
  { name: 'Solar Warning', emoji: '☀️', timeoutMinutes: 60, color: 0xf5924b },
  { name: 'Storm Warning', emoji: '⚡', timeoutMinutes: 60 * 7, color: 0xe67e22 },
  { name: 'Eclipse Warning', emoji: '🌑', timeoutMinutes: 60 * 24, color: 0xd94141 },
  { name: 'Supernova Warning', emoji: '💥', timeoutMinutes: 60 * 24 * 7, color: 0xb91c3c },
];

function getWarnLevel(streak) {
  const index = Math.min(streak - 1, WARN_LEVELS.length - 1);
  return WARN_LEVELS[index];
}

function isSmallWarn(warnTypeName) {
  return WARN_LEVELS.slice(0, 3).some((l) => l.name === warnTypeName);
}

module.exports = { WARN_LEVELS, getWarnLevel, isSmallWarn };
