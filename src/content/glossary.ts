// One plain-English sentence per term (40 words or fewer). `round` is where it is first taught.
export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  round: number;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  { id: 'ai', term: 'AI', round: 1, definition: 'Software that does tasks that normally need human judgment, such as recognizing images, writing text or making recommendations.' },
  { id: 'machine-learning', term: 'Machine learning', round: 1, definition: 'A way of building software where it learns patterns from many examples instead of following rules a person wrote by hand.' },
  { id: 'deep-learning', term: 'Deep learning', round: 1, definition: 'A kind of machine learning that uses large layered networks of numbers, and the approach behind most of today’s language, image and speech models.' },
  { id: 'llm', term: 'LLM (large language model)', round: 1, definition: 'A deep-learning model trained on huge amounts of text so it can predict and write text, and the engine inside tools like Claude, ChatGPT and Gemini.' },
  { id: 'token', term: 'Token', round: 1, definition: 'A small chunk of text, often a word or part of a word, which is the unit a language model reads, writes and is billed by.' },
  { id: 'next-token', term: 'Next-token prediction', round: 1, definition: 'The model’s basic move: it scores every possible next token given the text so far, picks one, adds it, and repeats.' },
  { id: 'temperature', term: 'Temperature', round: 1, definition: 'A setting for how adventurous the word choice is: low almost always picks the most likely next token, high gives more varied and riskier choices.' },
  { id: 'probabilistic', term: 'Probabilistic', round: 1, definition: 'Chosen by weighted chance, so the same input can produce different outputs.' },
  { id: 'hallucination', term: 'Hallucination', round: 1, definition: 'A confident, fluent answer from a model that is false or made up.' },
  { id: 'ai-pm', term: 'AI product manager', round: 1, definition: 'A product manager who decides which AI features to build, defines what good output looks like, and makes sure it is measured and safe.' },
  { id: 'eval', term: 'Eval', round: 1, definition: 'A test that scores an AI system’s outputs against a standard for good, so quality is measured instead of assumed.' },
  { id: 'model', term: 'Model', round: 2, definition: 'The trained file of numbers that turns input text into output text.' },
  { id: 'weights', term: 'Weights', round: 2, definition: 'The numbers inside a model, adjusted during training, that hold what it learned.' },
  { id: 'training', term: 'Training', round: 2, definition: 'The one-time, expensive process of adjusting a model’s weights on huge amounts of data until it predicts well.' },
  { id: 'inference', term: 'Inference', round: 2, definition: 'Using a trained model to produce an answer, which happens every time someone sends a prompt.' },
  { id: 'knowledge-cutoff', term: 'Knowledge cutoff', round: 2, definition: 'The date after which a model saw no training data, so it knows nothing newer unless you give it that information.' },
  { id: 'closed-model', term: 'Closed model', round: 2, definition: 'A model you can only use through the provider’s app or API, with the weights kept private.' },
  { id: 'open-weights', term: 'Open-weights model', round: 2, definition: 'A model whose trained weights are published so others can download and run it, even when the license or the training data is not fully open.' },
  { id: 'context-window', term: 'Context window', round: 2, definition: 'All the text a model can consider at once for a response, including your prompt, the conversation so far and the answer it is writing.' },
  { id: 'context-rot', term: 'Context rot', round: 2, definition: 'The tendency for a model’s accuracy and recall to get worse as the amount of text in its context window grows.' },
  { id: 'latency', term: 'Latency', round: 2, definition: 'The wait between sending a request and getting the answer, which grows with long prompts and long outputs.' },
  { id: 'prompt', term: 'Prompt', round: 3, definition: 'Everything you send a model for one request: the instructions, the material to work on and any examples.' },
  { id: 'role-prompt', term: 'Role', round: 3, definition: 'A line in the prompt that tells the model who to act as, such as a customer-insights analyst, to focus its tone and behavior.' },
  { id: 'few-shot', term: 'Few-shot prompting', round: 3, definition: 'Including a few worked examples of the output you want inside the prompt.' },
];

export function glossaryById(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((g) => g.id === id);
}
