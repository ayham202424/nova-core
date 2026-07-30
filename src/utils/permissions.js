const config = require('../config');

const RANKS = {
  TRIAL_STAFF: 1,
  STAFF: 2,
  HEAD_STAFF: 3,
  JUNIOR_MOD: 4,
  MOD: 5,
  HEAD_MOD: 6,
  COMMUNITY_MANAGER: 7,
  PROJECT_MANAGER: 8,
  MANAGER: 9,
  CO_FOUNDER: 10,
  FOUNDER: 11,
  OWNER: 12,
};

const RANK_NAMES = {
  1: 'Trial Staff',
  2: 'Staff',
  3: 'Head Staff',
  4: 'Junior Mod',
  5: 'Mod',
  6: 'Head Mod',
  7: 'Community Manager',
  8: 'Project Manager',
  9: 'Manager',
  10: 'Co-Founder',
  11: 'Founder',
  12: 'Owner',
};

const RANK_ROLE_ORDER = [
  { rank: RANKS.FOUNDER, roleId: config.roles.founder },
  { rank: RANKS.CO_FOUNDER, roleId: config.roles.coFounder },
  { rank: RANKS.MANAGER, roleId: config.roles.manager },
  { rank: RANKS.PROJECT_MANAGER, roleId: config.roles.projectManager },
  { rank: RANKS.COMMUNITY_MANAGER, roleId: config.roles.communityManager },
  { rank: RANKS.HEAD_MOD, roleId: config.roles.headMod },
  { rank: RANKS.MOD, roleId: config.roles.mod },
  { rank: RANKS.JUNIOR_MOD, roleId: config.roles.juniorMod },
  { rank: RANKS.HEAD_STAFF, roleId: config.roles.headStaff },
  { rank: RANKS.STAFF, roleId: config.roles.staff },
  { rank: RANKS.TRIAL_STAFF, roleId: config.roles.trialStaff },
];

function getRank(member) {
  if (member.guild.ownerId === member.id) return RANKS.OWNER;
  for (const { rank, roleId } of RANK_ROLE_ORDER) {
    if (roleId && member.roles.cache.has(roleId)) return rank;
  }
  return 0;
}

function hasRank(member, requiredRank) {
  return getRank(member) >= requiredRank;
}

function allStaffRoleIds() {
  return RANK_ROLE_ORDER.map((r) => r.roleId).filter(Boolean);
}

module.exports = { RANKS, RANK_NAMES, getRank, hasRank, allStaffRoleIds };
