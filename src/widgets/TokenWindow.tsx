import React from 'react';
import { estimateTokens, wordCount, tokenCost } from '../lib/tokens';

const SAMPLE =
  'Customers say the guitars arrive ready to play and sound great for the price. The most common complaints are about packaging that gets damaged in transit and shipping that takes longer than promised. A few people mention sharp fret edges, which a quick polish fixes.';

const WINDOWS = [
  { id: 'small', label: 'Small window', size: 8_000 },
  { id: 'medium', label: 'Medium window', size: 200_000 },
  { id: 'large', label: 'Large window', size: 1_000_000 },
];

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function TokenWindow() {
  const [text, setText] = React.useState(SAMPLE);
  const [win, setWin] = React.useState('small');
  const [instr, setInstr] = React.useState(500);
  const [history, setHistory] = React.useState(3000);
  const [docs, setDocs] = React.useState(2000);
  const [reserve, setReserve] = React.useState(1000);
  const [inPrice, setInPrice] = React.useState(3);
  const [outPrice, setOutPrice] = React.useState(15);

  const msg = estimateTokens(text);
  const size = WINDOWS.find((w) => w.id === win)!.size;
  const input = instr + history + docs + msg;
  const used = input + reserve;
  const pct = Math.min(100, (used / size) * 100);
  const over = used - size;
  const cost = tokenCost(input, inPrice) + tokenCost(reserve, outPrice);

  const seg = [
    { label: 'Instructions', n: instr, c: 7 },
    { label: 'Earlier messages', n: history, c: 6 },
    { label: 'Documents', n: docs, c: 3 },
    { label: 'Your message', n: msg, c: 2 },
    { label: 'Answer', n: reserve, c: 1 },
  ];

  return (
    <div className="widget-box" data-widget="token-window">
      <label htmlFor="tw-text" className="field-label">Paste or type your message</label>
      <textarea id="tw-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      <p data-testid="tw-estimate">
        {fmt(text.length)} characters, {fmt(wordCount(text))} words, about <strong>≈ {fmt(msg)} tokens</strong>
        <span className="muted"> (an estimate: about 4 characters per token)</span>
      </p>

      <fieldset className="plain">
        <legend className="field-label">Window size (example sizes)</legend>
        <div className="row">
          {WINDOWS.map((w) => (
            <label key={w.id} className="chip">
              <input type="radio" name="tw-win" id={`tw-win-${w.id}`} checked={win === w.id} onChange={() => setWin(w.id)} />
              <span>{w.label}: {fmt(w.size)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid-2">
        <div>
          <label htmlFor="tw-instr" className="field-label">Instructions (tokens)</label>
          <input id="tw-instr" type="number" min={0} step={100} value={instr} onChange={(e) => setInstr(num(e.target.value))} />
        </div>
        <div>
          <label htmlFor="tw-hist" className="field-label">Earlier messages (tokens)</label>
          <input id="tw-hist" type="number" min={0} step={500} value={history} onChange={(e) => setHistory(num(e.target.value))} />
        </div>
        <div>
          <label htmlFor="tw-docs" className="field-label">Documents you add (tokens)</label>
          <input id="tw-docs" type="number" min={0} step={500} value={docs} onChange={(e) => setDocs(num(e.target.value))} />
        </div>
        <div>
          <label htmlFor="tw-res" className="field-label">Answer length (tokens)</label>
          <input id="tw-res" type="number" min={0} step={100} value={reserve} onChange={(e) => setReserve(num(e.target.value))} />
        </div>
      </div>

      <div className="stack-bar" role="img" aria-label={`Window ${pct.toFixed(0)} percent full`}>
        {seg.map((s) => (
          <span key={s.label} className="stack-bar__seg" style={{ width: `${(s.n / Math.max(size, used)) * 100}%`, background: `var(--line-${s.c})` }} title={`${s.label}: ${fmt(s.n)} tokens`} />
        ))}
      </div>
      <ul className="legend-inline">
        {seg.map((s) => (
          <li key={s.label}><span className="swatch" style={{ background: `var(--line-${s.c})` }} aria-hidden="true" />{s.label} {fmt(s.n)}</li>
        ))}
      </ul>
      <p data-testid="tw-fit" className={over > 0 ? 'is-bad' : 'is-good'}>
        {over > 0 ? `Over the window by ${fmt(over)} tokens. The request would fail or lose text.` : `Fits: ${fmt(used)} of ${fmt(size)} tokens used (${pct.toFixed(1)}%).`}
      </p>

      <div className="grid-2">
        <div>
          <label htmlFor="tw-inp" className="field-label">Input price, $ per million tokens</label>
          <input id="tw-inp" type="number" min={0} step={0.5} value={inPrice} onChange={(e) => setInPrice(num(e.target.value))} />
        </div>
        <div>
          <label htmlFor="tw-outp" className="field-label">Output price, $ per million tokens</label>
          <input id="tw-outp" type="number" min={0} step={0.5} value={outPrice} onChange={(e) => setOutPrice(num(e.target.value))} />
        </div>
      </div>
      <p data-testid="tw-cost">
        One request costs about <strong>${cost.toFixed(4)}</strong>. A thousand of them cost about <strong>${(cost * 1000).toFixed(2)}</strong>.
      </p>
      <p className="muted small">
        Prices here are made-up examples, not a quote from any provider. Window sizes are examples too. Use the real numbers from the provider you plan to use. Token counts are estimates.
      </p>
    </div>
  );
}
