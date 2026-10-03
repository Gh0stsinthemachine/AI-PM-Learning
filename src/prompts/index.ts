// One builder per live feature. Every prompt starts with `Task: <id> (AI PM 102)` so the
// test stub can recognise it, and all instructions, data and the answer format go in the text
// (there is no system prompt the page controls). Nothing here runs without a click.
import type { Round } from '../content/manifest';
import { GLOSSARY } from '../content/glossary';

export const MAX_PROMPT_CHARS = 200_000;

export function askRoundPrompt(round: Round, question: string): string {
  const terms = GLOSSARY.filter((g) => g.round === round.n)
    .map((g) => `- ${g.term}: ${g.definition}`)
    .join('\n');
  const level = round.zone === 1 ? '101 (the learner is new to this topic)' : '102 (the learner knows the basics and wants depth)';
  return [
    'Task: ask-round (AI PM 102)',
    '',
    'You are a patient tutor in a course about AI product management. The learner is a business-minded founder who is not an engineer.',
    `Round ${round.n}: "${round.title}". Level: ${level}.`,
    terms ? `Terms this round teaches, with the course's own definitions:\n${terms}` : '',
    '',
    'Answer the learner\'s question in plain English. Define any technical term in the same sentence you first use it. Use a concrete example. Keep it under 150 words unless the question needs more. If you are not sure of a fact, say so instead of guessing. Do not claim to know anything about the learner.',
    '',
    `Question: ${question.slice(0, 2000)}`,
  ]
    .filter((x) => x !== '')
    .join('\n');
}

export function promptRunPrompt(assembled: string): string {
  return ['Task: prompt-run (AI PM 102)', '', assembled.slice(0, MAX_PROMPT_CHARS)].join('\n');
}
