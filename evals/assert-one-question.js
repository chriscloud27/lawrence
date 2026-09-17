// ".claude/rules/chatbot.md: One question per turn maximum." Counted, not judged
// by a rubric — a second question mark is unambiguous and cheap to catch.
module.exports = (output) => {
  const text = String(output);
  const questions = (text.match(/\?/g) || []).length;
  return {
    pass: questions <= 1,
    score: questions <= 1 ? 1 : 0,
    reason: `${questions} question mark(s) in the reply`,
  };
};
