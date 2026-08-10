const WELCOME_TEMPLATES = [
  '{user} just teleported into Nova-Creations! You\'re member #{count}. 🌙',
  'The stars aligned and {user} arrived! Welcome, member #{count}. ✨',
  '{user} has entered the galaxy. Say hi! Member #{count}. 🚀',
  'A new star is born — {user} just joined! You\'re #{count}. ⭐',
  '{user} landed safely in Nova-Creations. Member #{count}, welcome aboard! 🌌',
  'Everyone welcome {user} — our {count}th member! 🎉',
  '{user} slid into the server. Member #{count}, glad you\'re here! 🌠',
  'The night sky just got brighter — {user} joined as member #{count}. 🌙✨',
  '{user} has arrived! You\'re officially member #{count}. Welcome! 👋',
  'Say hello to {user}, our newest member — #{count}! 🌟',
  '{user} just crossed into Nova-Creations. Member #{count}, enjoy your stay! 🚪',
  'A shooting star named {user} just joined — make a wish! Member #{count}. 🌠',
  '{user} touched down. Welcome, member #{count}! 🛸',
  'Nova-Creations welcomes {user} — member number {count}! 🌌',
  '{user} is now part of the crew. Member #{count}, welcome! 🧑‍🚀',
];

const REJOIN_TEMPLATES = [
  'Welcome back, {user}! Good to see you again. 🌙',
  '{user} has returned to Nova-Creations! Welcome back. ✨',
  'Look who\'s back — {user}! Glad to have you again. 🌠',
];

function getWelcomeText(user, count) {
  const template = WELCOME_TEMPLATES[Math.floor(Math.random() * WELCOME_TEMPLATES.length)];
  return template.replace('{user}', user).replace('{count}', count);
}

function getRejoinText(user) {
  const template = REJOIN_TEMPLATES[Math.floor(Math.random() * REJOIN_TEMPLATES.length)];
  return template.replace('{user}', user);
}

module.exports = { getWelcomeText, getRejoinText };
