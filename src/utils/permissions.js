const config = require('../config');

const RANKS = {
  TRIAL_STAFF: 1,
  STAFF: 2,
  MOD: 3,
  HEAD_MOD: 4,
  MANAGER: 5,
  OWNER: 6,
};

const RANK_NAMES = {
  1: 'Trial Staff',
  2: 'Staff',
  3: 'Mod',
  4: 'Head Mod',
  5: 'Manager',
  6: 'Owner',
};

function getRank(member) {
  if (member.guild.ownerId === member.id) return RANKS.OWNER;
  if (member.roles.cache.has(config.roles.manager)) return RANKS.MANAGER;
  if (member.roles.cache.has(config.roles.headMod)) return RANKS.HEAD_MOD;
  if (member.roles.cache.has(config.roles.mod)) return RANKS.MOD;
  if (member.roles.cache.has(config.roles.staff)) return RANKS.STAFF;
  if (member.roles.cache.has(config.roles.trialStaff)) return RANKS.TRIAL_STAFF;
  return 0;
}

function hasRank(member, requiredRank) {
  return getRank(member) >= requiredRank;
}

module.exports = { RANKS, RANK_NAMES, getRank, hasRank };
