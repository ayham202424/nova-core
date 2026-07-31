const MAX_LEVEL = 30;

// Each level requires more XP than the last — harder to climb the higher you go.
function xpForNextLevel(currentLevel) {
  return 5 * currentLevel * currentLevel + 50 * currentLevel + 100;
}

module.exports = { MAX_LEVEL, xpForNextLevel };
