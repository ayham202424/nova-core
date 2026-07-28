function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (minutes < 1440) {
    const hrs = Math.round(minutes / 60);
    return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  }
  if (minutes < 10080) {
    const days = Math.round(minutes / 1440);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  const weeks = Math.round(minutes / 10080);
  return `${weeks} week${weeks === 1 ? '' : 's'}`;
}

module.exports = { formatDuration };
