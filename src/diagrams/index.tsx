import React from 'react';

// Inline SVG figures. Every colour is a token, so they work in light and dark.
function Frame(props: { label: string; caption: string; children: React.ReactNode }) {
  return (
    <figure className="figure">
      <div className="figure__scroll">{props.children}</div>
      <figcaption>{props.caption}</figcaption>
    </figure>
  );
}

function AiNesting() {
  const box = (x: number, y: number, w: number, h: number, label: string, note: string, n: number) => (
    <g key={label}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="var(--surface)" stroke={`var(--line-${n})`} strokeWidth={4} />
      <text x={x + 18} y={y + 28} className="svg-sign" fill="var(--ink)">{label}</text>
      <text x={x + 18} y={y + 48} className="svg-note" fill="var(--ink-2)">{note}</text>
    </g>
  );
  return (
    <Frame label="AI contains machine learning, which contains deep learning, which contains LLMs." caption="Each idea sits inside the one before it. An LLM is a kind of deep learning, which is a kind of machine learning, which is a kind of AI.">
      <svg viewBox="0 0 640 320" role="img" aria-label="Nested boxes: AI contains machine learning, which contains deep learning, which contains large language models." className="svg-fig">
        {box(8, 8, 624, 304, 'AI', 'Software that does tasks needing human judgment', 1)}
        {box(40, 70, 560, 232, 'MACHINE LEARNING', 'Learns patterns from examples', 7)}
        {box(72, 132, 496, 160, 'DEEP LEARNING', 'Large layered networks of numbers', 6)}
        {box(104, 194, 432, 88, 'LLMs', 'Trained on text to write text: Claude, ChatGPT, Gemini', 2)}
      </svg>
    </Frame>
  );
}

function ContextWindow() {
  const segs = [
    { w: 130, label: 'Instructions', n: 7 },
    { w: 210, label: 'Earlier messages', n: 6 },
    { w: 110, label: 'Your new message', n: 2 },
    { w: 150, label: 'The answer being written', n: 1 },
  ];
  let x = 20;
  return (
    <Frame label="" caption="Everything inside the bracket counts toward the context window, including the answer the model is writing.">
      <svg viewBox="0 0 640 170" role="img" aria-label="A bar divided into instructions, earlier messages, your new message and the answer being written, all inside one bracket labelled context window." className="svg-fig">
        {segs.map((s) => {
          const r = (
            <g key={s.label}>
              <rect x={x} y={50} width={s.w} height={56} fill="var(--surface)" stroke={`var(--line-${s.n})`} strokeWidth={4} />
              <text x={x + s.w / 2} y={84} textAnchor="middle" className="svg-note" fill="var(--ink)">{s.label}</text>
            </g>
          );
          x += s.w;
          return r;
        })}
        <path d="M20 122 V138 H620 V122" fill="none" stroke="var(--ink)" strokeWidth={3} />
        <text x={320} y={162} textAnchor="middle" className="svg-sign" fill="var(--ink)">CONTEXT WINDOW</text>
        <text x={20} y={34} className="svg-note" fill="var(--ink-2)">One request, left to right</text>
      </svg>
    </Frame>
  );
}

function PromptAnatomy() {
  const parts = [
    ['Role', 'Who the model acts as', 1],
    ['Context', 'Background and the material', 2],
    ['Examples', 'One to three samples of the output you want', 3],
    ['Task', 'What to do, with a specific verb', 4],
    ['Format', 'The shape of the answer', 5],
    ['Constraints', 'The limits: what not to do', 6],
  ] as const;
  return (
    <figure className="figure">
      <ol className="anatomy" aria-label="The six parts of a prompt">
        {parts.map(([name, what, n]) => (
          <li key={name} style={{ ['--line' as string]: `var(--line-${n})` }}>
            <span className="anatomy__name">{name}</span>
            <span className="anatomy__what">{what}</span>
          </li>
        ))}
      </ol>
      <figcaption>The six parts of a prompt. You rarely need all of them. Knowing them shows what is missing when an answer disappoints.</figcaption>
    </figure>
  );
}

const FIGURES: Record<string, () => React.ReactElement> = {
  'ai-nesting': AiNesting,
  'context-window': ContextWindow,
  'prompt-anatomy': PromptAnatomy,
};

export function FigureById(props: { id: string }) {
  const F = FIGURES[props.id];
  return F ? <F /> : null;
}

export const FIGURE_IDS = Object.keys(FIGURES);
