// The course map: 9 lines (one per roadmap topic) and 29 rounds.
// Zone 1 = 101 (broad), Zone 2 = 102 (deeper). Round ids are stable: r01 ... r29.
// Pure data. Whether a round has content yet is decided in content/index.ts.

export interface Line {
  n: number;
  name: string;
  short: string;
}

export const LINES: readonly Line[] = [
  { n: 1, name: 'Getting Started', short: 'Start' },
  { n: 2, name: 'Prompt Engineering', short: 'Prompts' },
  { n: 3, name: 'Context Engineering & RAG', short: 'Context' },
  { n: 4, name: 'AI Prototyping & Vibe Coding', short: 'Prototyping' },
  { n: 5, name: 'AI Agents & Agentic Workflows', short: 'Agents' },
  { n: 6, name: 'AI Evals, Testing & Observability', short: 'Evals' },
  { n: 7, name: 'Foundation Models', short: 'Models' },
  { n: 8, name: 'AI PRDs & Building', short: 'PRDs' },
  { n: 9, name: 'Career Resources', short: 'Careers' },
];

export type RoundKind = 'hub' | 'line' | 'junction' | 'terminus';

export interface Round {
  id: string;
  n: number;
  kind: RoundKind;
  /** Line number 1-9. Hub and junction sit on line 1; the terminus has none. */
  line: number;
  zone: 1 | 2;
  title: string;
  station: string;
  widget: string;
  minutes: number;
}

const r = (n: number, kind: RoundKind, line: number, zone: 1 | 2, station: string, title: string, widget: string): Round => ({
  id: 'r' + String(n).padStart(2, '0'), n, kind, line, zone, station, title, widget, minutes: 20,
});

export const ROUNDS: readonly Round[] = [
  r(1, 'hub', 1, 1, 'Central', 'The big picture', 'temp-sampler'),
  r(2, 'line', 7, 1, 'Models', 'Models 101', 'token-window'),
  r(3, 'line', 2, 1, 'Prompts', 'Prompting 101', 'prompt-builder'),
  r(4, 'line', 3, 1, 'Context', 'Context and RAG 101', 'retrieval-peek'),
  r(5, 'line', 5, 1, 'Agents', 'Agents 101', 'agent-steps'),
  r(6, 'line', 4, 1, 'Prototypes', 'Vibe coding 101', 'app-anatomy'),
  r(7, 'line', 6, 1, 'Evals', 'Evals 101', 'be-the-judge'),
  r(8, 'line', 8, 1, 'PRDs', 'AI PRDs and risk 101', 'mistake-spotter'),
  r(9, 'line', 9, 1, 'Careers', 'Careers 101', 'skills-checklist'),
  r(10, 'junction', 1, 1, 'Junction', 'Putting it together', 'build-order'),
  r(11, 'line', 1, 2, 'Next Word', 'How a model writes an answer', 'temp-sampler-full'),
  r(12, 'line', 1, 2, 'AI Products', 'What makes AI products different', 'ai-shaped-sorter'),
  r(13, 'line', 7, 2, 'Families', 'Model families and types', 'model-flashcards'),
  r(14, 'line', 7, 2, 'Choosing', 'Choosing a model', 'cost-calculator'),
  r(15, 'line', 2, 2, 'Structure', 'Prompt structure', 'prompt-grader'),
  r(16, 'line', 2, 2, 'Reasoning', 'Reasoning and agent prompts', 'technique-matcher'),
  r(17, 'line', 3, 2, 'Pipeline', 'Context engineering and the RAG pipeline', 'mini-rag'),
  r(18, 'line', 3, 2, 'Knowledge', 'Where knowledge lives', 'rag-decision-tree'),
  r(19, 'line', 5, 2, 'Loops', 'Workflows, agents and the ReAct loop', 'agent-lab'),
  r(20, 'line', 5, 2, 'Protocols', 'MCP, A2A and the tool landscape', 'workflow-sorter'),
  r(21, 'line', 4, 2, 'Tool Spectrum', 'The prototyping tool spectrum', 'tool-picker'),
  r(22, 'line', 4, 2, 'Spec to Build', 'From spec to prototype', 'spec-builder'),
  r(23, 'line', 6, 2, 'Evals as Spec', 'Evals as your spec', 'confusion-lab'),
  r(24, 'line', 6, 2, 'Judges', 'An LLM judge you can trust', 'judge-lab'),
  r(25, 'line', 8, 2, 'Strategy', 'AI strategy and the AI PRD', 'prd-builder'),
  r(26, 'line', 8, 2, 'Risk', 'Risk and the classic mistakes', 'risk-matrix'),
  r(27, 'line', 9, 2, 'Way In', 'Your way in', 'portfolio-planner'),
  r(28, 'line', 9, 2, 'Interviews', 'Interviews', 'mock-interview'),
  r(29, 'terminus', 0, 2, 'Terminus', 'Capstone: your AI product brief', 'capstone'),
];

export const TOTAL_ROUNDS = ROUNDS.length;

export function roundById(id: string): Round | undefined {
  return ROUNDS.find((x) => x.id === id);
}

export function roundsOnLine(line: number): Round[] {
  return ROUNDS.filter((x) => x.line === line).sort((a, b) => a.n - b.n);
}

export function zoneLabel(z: 1 | 2): string {
  return z === 1 ? 'Zone 1 · 101' : 'Zone 2 · 102';
}
