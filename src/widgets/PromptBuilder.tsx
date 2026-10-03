import React from 'react';
import { useLiveCall } from '../runtime/useLiveCall';
import { promptRunPrompt } from '../prompts';
import { LiveOutput, LIVE_NOTE } from '../components/LiveBox';
import { copyText } from '../runtime/clipboard';
import { LiveOff, useLiveOffCopy } from '../components/LiveOff';

// The six parts of a prompt, pre-filled for a guitar shop's review summarizer.
// The reviews are made up for this exercise.
export const REVIEWS = [
  'Case latch arrived cracked, but the guitar plays beautifully.',
  'Shipping took 9 days. The guitar sounds great though.',
  'Great value, and the setup was perfect out of the box.',
  'The box was crushed in transit. The guitar itself was fine.',
  'Sounds amazing for the price. Fast replies from the shop.',
  'Frets were a bit sharp on the edges. Otherwise a lovely guitar.',
  "Took forever to ship. Won't order again unless it's faster.",
  'Ready to play out of the box. Packaging was thin.',
];

export interface Part { id: string; label: string; n: number; text: string }

export const PARTS: Part[] = [
  { id: 'role', label: 'Role', n: 1, text: 'You are a customer-insights analyst for a guitar shop.' },
  { id: 'context', label: 'Context', n: 2, text: 'We sell used guitars online. The reviews below are from the last 90 days.' },
  { id: 'examples', label: 'Examples', n: 3, text: 'Example of the style I want:\nComplaints\n- Packaging damaged the case (mentioned often)\nPraises\n- Setup was ready to play out of the box' },
  { id: 'task', label: 'Task', n: 4, text: 'Summarize the reviews into the most common complaints and the most common praises.' },
  { id: 'format', label: 'Format', n: 5, text: 'Return two bulleted lists, no more than 15 words per bullet, with the number of reviews that mention each point.' },
  { id: 'constraints', label: 'Constraints', n: 6, text: 'Use only what is in the reviews. If a point appears in only one review, leave it out.' },
];

/** Reviews go above the instructions, as long material works best placed before the question. */
export function assemblePrompt(parts: Part[], on: Record<string, boolean>): string {
  const pick = (id: string) => (on[id] ? parts.find((p) => p.id === id)?.text : undefined);
  const head = [pick('role'), pick('context')].filter(Boolean).join('\n\n');
  const body = ['Reviews:\n' + REVIEWS.map((r, i) => `${i + 1}. ${r}`).join('\n')];
  const tail = [pick('examples'), pick('task'), pick('format'), pick('constraints')].filter(Boolean).join('\n\n');
  return [head, ...body, tail].filter(Boolean).join('\n\n');
}

const WEAK_EXAMPLE =
  'Customers generally like the guitars and say they sound and play well. Some had problems with shipping and packaging, and a few mentioned small issues like sharp fret edges. Overall the reviews are positive with some delivery concerns.';
const STRONG_EXAMPLE = 'Complaints\n- Packaging damaged or thin (3 reviews)\n- Slow shipping (2 reviews)\nPraises\n- Plays and sounds great (3 reviews)\n- Ready to play out of the box (2 reviews)\n- Good value for the price (2 reviews)';

export function PromptBuilder() {
  const live = useLiveCall();
  const offCopy = useLiveOffCopy();
  const [on, setOn] = React.useState<Record<string, boolean>>({ role: false, context: false, examples: false, task: true, format: false, constraints: false });
  const [texts, setTexts] = React.useState<Record<string, string>>(() => Object.fromEntries(PARTS.map((p) => [p.id, p.text])));
  const [copied, setCopied] = React.useState('');
  const outRef = React.useRef<HTMLTextAreaElement>(null);

  const parts = PARTS.map((p) => ({ ...p, text: texts[p.id] ?? p.text }));
  const prompt = assemblePrompt(parts, on);
  const count = Object.values(on).filter(Boolean).length;
  const liveOk = offCopy === null;
  const busy = live.state.status === 'thinking' || live.state.status === 'streaming';

  return (
    <div className="widget-box" data-widget="prompt-builder">
      <p className="muted">Switch parts on and off, edit the wording, and see the assembled prompt. The task is on by default.</p>
      <div className="parts">
        {parts.map((p) => (
          <div key={p.id} className="part" style={{ ['--line' as string]: `var(--line-${p.n})` }}>
            <label className="part__toggle">
              <input type="checkbox" id={`pb-on-${p.id}`} checked={!!on[p.id]} onChange={(e) => setOn((o) => ({ ...o, [p.id]: e.target.checked }))} />
              <span className="part__name">{p.label}</span>
            </label>
            <textarea id={`pb-text-${p.id}`} aria-label={`${p.label} text`} rows={p.id === 'examples' ? 5 : 3} value={p.text} disabled={!on[p.id]} onChange={(e) => setTexts((t) => ({ ...t, [p.id]: e.target.value }))} />
          </div>
        ))}
      </div>

      <h3>Your prompt ({count} of 6 parts)</h3>
      <textarea ref={outRef} id="pb-assembled" className="mono" readOnly rows={16} value={prompt} aria-label="Assembled prompt" />
      <div className="row">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={async () => setCopied((await copyText(prompt, outRef.current)) ? 'Copied.' : 'Press Ctrl or Command + C to copy.')}
        >
          Copy prompt
        </button>
        {liveOk && (
          <button type="button" className="btn" disabled={!live.available || busy} onClick={() => void live.run(promptRunPrompt(prompt), { modelTier: 'quick' })}>
            Run my prompt
          </button>
        )}
        <span className="muted small" role="status">{copied}</span>
      </div>
      {liveOk ? <p className="muted small">{live.pending ? 'Connecting to Claude…' : LIVE_NOTE}</p> : <LiveOff />}
      <LiveOutput state={live.state} onStop={live.stop} label="Claude's answer to your prompt" />

      <h3>Worked example</h3>
      <p className="muted small">Written by hand from the eight example reviews to show the difference. These are not live answers.</p>
      <div className="grid-2">
        <div>
          <p className="field-label">Task only</p>
          <pre className="example-out">{WEAK_EXAMPLE}</pre>
          <p className="muted small">A paragraph. It includes a point only one review made, and it has no counts.</p>
        </div>
        <div>
          <p className="field-label">All six parts</p>
          <pre className="example-out">{STRONG_EXAMPLE}</pre>
          <p className="muted small">Two lists with counts. The single mention of sharp frets was left out, as the constraint asked.</p>
        </div>
      </div>
    </div>
  );
}
