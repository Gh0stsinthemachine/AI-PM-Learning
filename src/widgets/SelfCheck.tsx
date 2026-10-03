import React from 'react';
import { LINES } from '../content/manifest';
import { useProgress } from '../state/ProgressProvider';

const LEVELS = [
  { v: 'new', label: 'New to me' },
  { v: 'heard', label: 'Heard of it' },
  { v: 'explain', label: 'Could explain it' },
];

/** "Where are you now?" One honest rating per line, saved to the notebook. */
export function SelfCheck() {
  const { notebook, actions } = useProgress();
  const saved = notebook.forms.selfcheck?.fields ?? {};
  const set = (n: number, v: string) => actions.setForm('selfcheck', { ...saved, [`l${n}`]: v });
  const newOnes = LINES.filter((l) => saved[`l${l.n}`] === 'new');
  return (
    <div className="widget-box" data-widget="self-check">
      <h3>Where are you now?</h3>
      <p className="muted">One honest answer per line. Nobody sees this, and you can change it any time.</p>
      <div className="selfcheck">
        {LINES.map((l) => (
          <fieldset key={l.n} className="plain selfcheck__row" style={{ ['--line' as string]: `var(--line-${l.n})` }}>
            <legend><span className="bullet">{l.n}</span> {l.name}</legend>
            <div className="row">
              {LEVELS.map((lv) => (
                <label key={lv.v} className="chip">
                  <input type="radio" name={`sc-${l.n}`} id={`sc-${l.n}-${lv.v}`} checked={saved[`l${l.n}`] === lv.v} onChange={() => set(l.n, lv.v)} />
                  <span>{lv.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {newOnes.length > 0 && (
        <p data-testid="selfcheck-new">Lines that are new to you: {newOnes.map((l) => l.short).join(', ')}. Take extra time in their Zone 1 rounds.</p>
      )}
    </div>
  );
}
