// Add more suspicious domain patterns here anytime.
const SCAM_PATTERNS = [
  'robux-generator', 'robuxgenerator', 'free-robux', 'freerobux', 'robux-free',
  'get-robux', 'getrobux', 'robux-hack', 'robuxhack', 'robux.gg',
  'roblox-gift', 'robloxgift', 'roblox-free', 'robloxfree',
  'discord-nitro', 'discordnitro', 'discord-gift', 'nitro-generator',
  'steamcommunlty', 'steamcommunilty', 'steancommunity', 'steamcommunnity',
  'roblx.com', 'robl0x', 'r0blox', 'discrod', 'discor.gg',
];

function checkScamLink(content) {
  if (!content) return null;
  const urlRegex = /https?:\/\/[^\s]+/gi;
  const urls = content.match(urlRegex) || [];

  for (const url of urls) {
    const lower = url.toLowerCase();
    for (const pattern of SCAM_PATTERNS) {
      if (lower.includes(pattern)) return url;
    }
  }
  return null;
}

module.exports = { checkScamLink, SCAM_PATTERNS };
