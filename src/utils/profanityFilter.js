// Starter list — add more words yourself here (including anything more severe you want blocked).
// Keep entries lowercase, no spaces.
const BLOCKED_WORDS = [
  'fuck', 'fuk', 'fuc', 'fck', 'fcking', 'fucking', 'fucked',
  'shit', 'shyt',
  'bitch', 'btch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
];

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[@]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z\s]/g, '')
    .replace(/(.)\1+/g, '$1');
}

function checkProfanity(rawText) {
  if (!rawText) return null;
  const normalized = normalize(rawText);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (BLOCKED_WORDS.includes(token)) return token;
  }
  return null;
}

module.exports = { checkProfanity, BLOCKED_WORDS };
