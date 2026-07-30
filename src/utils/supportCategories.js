const SUPPORT_CATEGORIES = {
  hired: {
    label: 'Get Hired By Us',
    emoji: '💼',
    fields: [
      { id: 'position', label: 'Which position are you applying for?', style: 'Short', maxLength: 100, required: true },
      { id: 'why', label: 'Why should we hire you?', style: 'Paragraph', maxLength: 500, required: true },
      { id: 'experience', label: 'Relevant experience (if any)', style: 'Paragraph', maxLength: 500, required: false },
    ],
  },
  bug: {
    label: 'Report a Bug',
    emoji: '🐛',
    fields: [
      { id: 'bug', label: 'What is the bug?', style: 'Paragraph', maxLength: 500, required: true },
      { id: 'steps', label: 'Steps to reproduce it', style: 'Paragraph', maxLength: 500, required: true },
      { id: 'platform', label: 'Where did it happen? (Discord/Roblox/etc.)', style: 'Short', maxLength: 100, required: true },
    ],
  },
  report: {
    label: 'Report a Person',
    emoji: '🚨',
    fields: [
      { id: 'who', label: 'Who are you reporting? (username)', style: 'Short', maxLength: 100, required: true },
      { id: 'what', label: 'What did they do?', style: 'Paragraph', maxLength: 500, required: true },
      { id: 'proof', label: 'Proof (links, description)', style: 'Paragraph', maxLength: 500, required: false },
    ],
  },
  other: {
    label: 'Other / Partnership',
    emoji: '❓',
    fields: [
      { id: 'topic', label: 'What is this about?', style: 'Short', maxLength: 100, required: true },
      { id: 'details', label: 'Additional details', style: 'Paragraph', maxLength: 500, required: true },
    ],
  },
};

module.exports = { SUPPORT_CATEGORIES };
