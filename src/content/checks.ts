// Quick checks: four multiple-choice questions per round. The same questions are reused
// as warm-up recall in later rounds, so each one must make sense on its own.
export interface Mcq {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface RoundCheck {
  round: number;
  takeawayPrompt: string;
  questions: Mcq[];
}

export const CHECKS: readonly RoundCheck[] = [
  {
    round: 1,
    takeawayPrompt: 'In a sentence or two: which of the nine lines are you least sure about, and what do you want to be able to do after this course?',
    questions: [
      {
        id: 'r01-q1',
        prompt: 'What is a large language model’s basic job?',
        choices: [
          'Look facts up in a database',
          'Predict the next token from the text so far, over and over',
          'Follow a fixed list of rules written by engineers',
          'Search the web for the best answer',
        ],
        answer: 1,
        explanation: 'It scores every possible next token, picks one, adds it to the text and repeats. Everything else it does is built on that move.',
      },
      {
        id: 'r01-q2',
        prompt: 'You raise the temperature setting. What changes?',
        choices: [
          'The model reads more of your text',
          'The model is more willing to pick less likely tokens, so answers vary more',
          'The model becomes smarter',
          'The answers get shorter',
        ],
        answer: 1,
        explanation: 'Temperature spreads out the odds. Low temperature almost always picks the top token. High temperature gives the unlikely ones a real chance.',
      },
      {
        id: 'r01-q3',
        prompt: 'Why does an AI feature need evals when most traditional features do not?',
        choices: [
          'AI features cannot be tested',
          'Evals make the model cheaper',
          'Output can vary and be wrong while sounding fine, so quality has to be measured, not assumed',
          'Regulators require evals for every AI feature',
        ],
        answer: 2,
        explanation: 'Because output is probabilistic, you cannot promise exact behavior in advance. An eval is how you find out how good it actually is.',
      },
      {
        id: 'r01-q4',
        prompt: 'Which nesting is correct?',
        choices: [
          'AI is a kind of LLM',
          'LLMs are a kind of deep learning, which is a kind of machine learning, which is a kind of AI',
          'Machine learning is a kind of LLM',
          'Deep learning and LLMs are unrelated',
        ],
        answer: 1,
        explanation: 'AI is the widest idea. Machine learning is one way to build it, deep learning is one kind of machine learning, and LLMs are deep-learning models for text.',
      },
    ],
  },
  {
    round: 2,
    takeawayPrompt: 'Which model or tool do you use most today, and what is one thing about it you now understand differently?',
    questions: [
      {
        id: 'r02-q1',
        prompt: 'About how many characters of ordinary English make up one token?',
        choices: ['1', 'About 4', 'About 20', 'About 100'],
        answer: 1,
        explanation: 'A common rule of thumb is about four characters, or roughly three quarters of a word. It is only an estimate. Code and other languages usually take more tokens.',
      },
      {
        id: 'r02-q2',
        prompt: 'What does a model’s context window include?',
        choices: [
          'Only your latest message',
          'The whole conversation so far plus the answer the model is writing',
          'Only the provider’s hidden instructions',
          'Only the data it was trained on',
        ],
        answer: 1,
        explanation: 'It is the model’s working memory for one response: everything it can look at, including its own answer. Training data is separate.',
      },
      {
        id: 'r02-q3',
        prompt: 'What does “open-weights” mean?',
        choices: [
          'The training data is public',
          'The trained numbers are published so others can download and run the model',
          'Anyone can change the provider’s hosted model',
          'The model has no license terms',
        ],
        answer: 1,
        explanation: 'Open-weights means the weights are available. The license can still have limits, and the training data is usually not shared, so it is not always “open source”.',
      },
      {
        id: 'r02-q4',
        prompt: 'In a long chat through an API, why does each new message cost more than the last?',
        choices: [
          'The provider raises the price during long chats',
          'The earlier messages are sent again as input on every turn',
          'The model gets slower as it learns your style',
          'Longer chats use a bigger model',
        ],
        answer: 1,
        explanation: 'The model does not remember on its own. The conversation so far is sent along with each new message, so the input grows every turn.',
      },
    ],
  },
  {
    round: 3,
    takeawayPrompt: 'Think of one task you do each week. Write the task part of a prompt for it in one sentence.',
    questions: [
      {
        id: 'r03-q1',
        prompt: 'A prompt says only “Summarize these reviews.” What is the best first fix?',
        choices: [
          'Make it longer by repeating the instruction',
          'Say what to extract, who it is for and what shape the answer should take',
          'Add the word “please”',
          'Switch to a bigger model',
        ],
        answer: 1,
        explanation: 'Vague tasks get vague answers. Naming what to pull out, the audience and the format removes most of the guessing.',
      },
      {
        id: 'r03-q2',
        prompt: 'What are examples inside a prompt mostly good for?',
        choices: [
          'Showing the exact format and tone you want',
          'Teaching the model new facts permanently',
          'Making the answer cheaper',
          'Replacing the task description',
        ],
        answer: 0,
        explanation: 'Examples are one of the most reliable ways to steer format and tone. They do not teach the model anything permanently, and they work best alongside a clear task.',
      },
      {
        id: 'r03-q3',
        prompt: 'You changed a prompt that works well. What should you do before shipping it?',
        choices: [
          'Nothing, a better-looking prompt is better',
          'Re-run it on a set of real inputs and compare with the old version',
          'Ask the model whether the new prompt is better',
          'Ship it and wait for complaints',
        ],
        answer: 1,
        explanation: 'A change that fixes one input can break another. Re-testing on real inputs is how you know the prompt really improved.',
      },
      {
        id: 'r03-q4',
        prompt: 'Which of the six prompt parts sets limits, such as what not to do or a maximum length?',
        choices: ['Role', 'Context', 'Format', 'Constraints'],
        answer: 3,
        explanation: 'Constraints are the limits. Format describes the shape of the answer, and context is the background the model needs.',
      },
    ],
  },
];

export function checkForRound(n: number): RoundCheck | undefined {
  return CHECKS.find((c) => c.round === n);
}
