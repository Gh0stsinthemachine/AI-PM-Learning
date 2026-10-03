import React from 'react';
import { softmax, sampleIndex } from '../lib/softmax';
import { mulberry32 } from '../lib/rng';

// Toy scores for the next word after "The guitar shop owner unlocked the ...".
// These are made-up numbers to show the idea, not output from a real model.
const WORDS = ['door', 'store', 'case', 'safe', 'amp'];
const SCORES = [3.0, 2.4, 1.6, 1.1, 0.3];

export function TempSampler() {
  const [temp, setTemp] = React.useState(1);
  const [picks, setPicks] = React.useState<number[]>([]);
  const [counts, setCounts] = React.useState<number[] | null>(null);
  const draws = React.useRef(0);
  const probs = softmax(SCORES, temp);
  const top = probs.indexOf(Math.max(...probs));

  const draw = (n: number) => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      draws.current += 1;
      out.push(sampleIndex(probs, mulberry32(1000 + draws.current)()));
    }
    return out;
  };
  const reset = () => {
    setPicks([]);
    setCounts(null);
    draws.current = 0;
  };

  return (
    <div className="widget-box" data-widget="temp-sampler">
      <p className="sentence">
        The guitar shop owner unlocked the{' '}
        <strong className="sentence__blank">{picks.length ? WORDS[picks[picks.length - 1]!] : '…'}</strong>
      </p>
      <label htmlFor="temp" className="field-label">
        Temperature: <output htmlFor="temp" data-testid="temp-value">{temp.toFixed(1)}</output>
        <span className="muted"> ({temp <= 0.4 ? 'steady' : temp >= 1.5 ? 'adventurous' : 'in between'})</span>
      </label>
      <input id="temp" type="range" min={0.1} max={2} step={0.1} value={temp} onChange={(e) => { setTemp(Number(e.target.value)); setCounts(null); }} />
      <ul className="bars" aria-label="Chance of each next word">
        {WORDS.map((w, i) => (
          <li key={w} className={i === top ? 'is-top' : ''}>
            <span className="bars__word">{w}</span>
            <span className="bars__track" aria-hidden="true"><span className="bars__fill" style={{ width: `${probs[i]! * 100}%` }} /></span>
            <span className="bars__pct" data-testid={`pct-${w}`}>{(probs[i]! * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
      <div className="row">
        <button type="button" className="btn" onClick={() => { setPicks((p) => [...p, ...draw(1)]); setCounts(null); }}>Pick a word</button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            const c = WORDS.map(() => 0);
            for (const i of draw(20)) c[i]!++;
            setCounts(c);
          }}
        >
          Pick 20 times
        </button>
        <button type="button" className="btn btn--ghost" onClick={reset}>Reset</button>
      </div>
      {picks.length > 0 && (
        <p className="muted" data-testid="pick-history">Your picks: {picks.map((i) => WORDS[i]).join(', ')}</p>
      )}
      {counts && (
        <p data-testid="pick-counts">
          In 20 picks at temperature {temp.toFixed(1)}: {WORDS.map((w, i) => `${w} ${counts[i]}`).join(', ')}.
        </p>
      )}
      <p className="muted small">
        Try 0.1, then 2.0, and pick 20 times each. Low temperature gives nearly the same word every time. High temperature spreads the picks out. These scores are made up to show the idea. They are not from a real model.
      </p>
    </div>
  );
}
