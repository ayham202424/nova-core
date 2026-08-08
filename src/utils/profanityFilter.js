// Add more words directly here any time — normalization below covers all bypass variants automatically
// (leetspeak, accented/special characters, homoglyphs, repeated letters, inserted punctuation, single dropped letters).
const BLOCKED_WORDS = [
  'arse', 'arsehead', 'arsehole', 'ass', 'asshole',
  'bastard', 'bitch', 'bollocks', 'brotherfucker', 'bullshit',
  'chigga', 'childfucker', 'cock', 'cocksucker', 'crap', 'cunt',
  'dick', 'dickhead', 'dumbass', 'dyke',
  'fag', 'faggot', 'fatherfucker', 'fuck', 'fucked', 'fucker', 'fucking',
  'goddammit', 'goddamn', 'goddamned', 'goddamnit', 'godsdamn',
  'jackass',
  'kike',
  'motherfucker',
  'nigga', 'nigger',
  'pigfucker', 'piss', 'prick', 'pussy',
  'shit', 'shite', 'sisterfuck', 'sisterfucker', 'slut', 'spastic',
  'tranny', 'twat',
  'wanker',
  // Uncomment below to also block "gay" when used as an insult — left out by default since
  // it's an identity term that's also used neutrally, not inherently profanity:
  // 'gay',
];

const HOMOGLYPHS = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'к': 'k', 'м': 'm', 'т': 't', // Cyrillic
  'α': 'a', 'ο': 'o', 'ρ': 'p', 'ε': 'e', 'κ': 'k', 'ι': 'i', // Greek
};

function replaceHomoglyphs(text) {
  return text.replace(/./g, (ch) => HOMOGLYPHS[ch] || ch);
}

function normalize(text) {
  let result = text.toLowerCase();
  result = replaceHomoglyphs(result);
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strips accents: é→e, ú→u, ï→i, ç→c, etc.
  result = result
    .replace(/[ßẞ]/g, 's')
    .replace(/[øØ]/g, 'o')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[@]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[.\-_*#+~]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/(.)\1+/g, '$1');
  return result;
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

const NORMALIZED_LIST = BLOCKED_WORDS.map((w) => normalize(w));
// Fuzzy matching (catches one dropped/swapped letter, e.g. "fck" or "shyt") only applies to
// words 5+ letters long — shorter words stay exact-match-only to avoid false positives
// (e.g. a 4-letter fuzzy check would flag innocent words like "duck" as close to "fuck").
const FUZZY_LIST = NORMALIZED_LIST.filter((w) => w.length >= 5);

function checkProfanity(rawText) {
  if (!rawText) return null;

  const tokens = rawText.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const normalizedToken = normalize(token);
    if (!normalizedToken) continue;

    if (NORMALIZED_LIST.includes(normalizedToken)) return normalizedToken;

    if (normalizedToken.length >= 4) {
      for (const word of FUZZY_LIST) {
        if (Math.abs(normalizedToken.length - word.length) <= 1 && levenshtein(normalizedToken, word) <= 1) {
          return word;
        }
      }
    }
  }

  let run = [];
  for (const token of tokens) {
    const stripped = token.replace(/[^a-zA-Z0-9]/g, '');
    if (stripped.length === 1) {
      run.push(stripped);
    } else {
      if (run.length >= 3) {
        const merged = normalize(run.join(''));
        if (NORMALIZED_LIST.includes(merged)) return merged;
      }
      run = [];
    }
  }
  if (run.length >= 3) {
    const merged = normalize(run.join(''));
    if (NORMALIZED_LIST.includes(merged)) return merged;
  }

  return null;
}

module.exports = { checkProfanity, BLOCKED_WORDS };
