const config = require('../config');

const MILESTONE_LEVELS = [1, 5, 10, 15, 20, 25, 30];

const MILESTONE_ROLE_MAP = {
  1: config.levelRoles.level1,
  5: config.levelRoles.level5,
  10: config.levelRoles.level10,
  15: config.levelRoles.level15,
  20: config.levelRoles.level20,
  25: config.levelRoles.level25,
  30: config.levelRoles.level30,
};

function getMilestoneRoleId(level) {
  let applicable = null;
  for (const m of MILESTONE_LEVELS) {
    if (level >= m) applicable = m;
  }
  return applicable ? MILESTONE_ROLE_MAP[applicable] : null;
}

module.exports = { MILESTONE_LEVELS, MILESTONE_ROLE_MAP, getMilestoneRoleId };
