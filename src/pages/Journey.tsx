import React from 'react';
import { ROUNDS, TOTAL_ROUNDS, LINES } from '../content/manifest';
import { isReady } from '../content/index';
import { Board } from '../components/Header';
import { useProgress } from '../state/ProgressProvider';
import { useCapabilities } from '../runtime/capabilities';
import { completedCount, completionTimes } from '../state/progress';
import { doneThisWeek, effectivePace, projectFinishWeek, formatWeekOf } from '../lib/pace';
import { roundState, STATE_TEXT } from '../map/status';
import { saveText } from '../runtime/downloads';

export function Journey() {
  const { progress, notebook, actions, syncCopy } = useProgress();
  const caps = useCapabilities();
  const [saved, setSaved] = React.useState('');
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [exportText, setExportText] = React.useState('');
  const now = new Date();
  const comps = completionTimes(progress);
  const done = completedCount(progress);
  const eff = effectivePace(progress.perWeek, comps, now);
  const finish = projectFinishWeek({ total: TOTAL_ROUNDS, done, perWeek: eff, doneThisWeek: doneThisWeek(comps, now), now });
  const entries = Object.entries(notebook.entries).filter(([, v]) => v.text.trim()).sort(([a], [b]) => (a < b ? -1 : 1));

  const doExport = async () => {
    const text = JSON.stringify({ exportedAt: new Date().toISOString(), progress, notebook }, null, 2);
    const r = await saveText(caps.downloads.api, caps.inViewer, 'ai-pm-102-progress.json', text);
    setSaved(r === 'saved' ? 'Saved.' : r === 'declined' ? 'Not saved.' : r === 'busy' ? 'A save prompt is already open.' : '');
    setExportText(r === 'show-text' || r === 'failed' ? text : '');
  };

  return (
    <>
      <Board line={0} bullet="J" title="Your journey" right={`${done} of ${TOTAL_ROUNDS} stations`} />

      <section className="panel" aria-label="Pace">
        <h2>Pace</h2>
        <label htmlFor="pace" className="field-label">Rounds per week</label>
        <select id="pace" value={progress.perWeek} onChange={(e) => actions.setPace(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} a week (about {n * 20} minutes)</option>)}
        </select>
        <p data-testid="journey-finish">
          {done >= TOTAL_ROUNDS ? 'You finished the course.' : <>At your recent pace of about {eff.toFixed(1)} rounds a week, the course finishes the week of <strong>{formatWeekOf(finish)}</strong>.</>}
        </p>
        <p className="muted small">The estimate starts from the pace you choose. After two full weeks it follows how many rounds you actually finish.</p>
      </section>

      <section className="panel" aria-label="Rounds">
        <h2>Rounds</h2>
        <div className="table-scroll">
          <table className="rounds-table">
            <thead><tr><th scope="col">Round</th><th scope="col">Line</th><th scope="col">Status</th><th scope="col">Best check</th></tr></thead>
            <tbody>
              {ROUNDS.map((r) => {
                const ready = isReady(r.id);
                const c = progress.checks[r.id];
                return (
                  <tr key={r.id}>
                    <th scope="row">{r.n}. {ready ? <a href={`#${r.id}`}>{r.title}</a> : r.title}</th>
                    <td>{r.line ? LINES.find((l) => l.n === r.line)?.short : 'Capstone'}</td>
                    <td>{ready ? STATE_TEXT[roundState(progress, r.id)] : 'opening soon'}</td>
                    <td>{c ? `${c.best} of ${c.of}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" aria-label="Notebook">
        <h2>Notebook</h2>
        {entries.length === 0 ? <p className="muted">Your takeaways and notes will collect here as you finish rounds.</p> : (
          <dl className="notes">
            {entries.map(([k, v]) => (<React.Fragment key={k}><dt>{noteLabel(k)}</dt><dd>{v.text}</dd></React.Fragment>))}
          </dl>
        )}
      </section>

      <section className="panel" aria-label="Your data">
        <h2>Your data</h2>
        <p data-testid="journey-sync">{syncCopy}.</p>
        <p className="muted small">
          Progress and notes are saved privately to your account when you open this page in claude.ai, so they follow you between your phone and laptop. Outside claude.ai they stay in this browser only. Nothing here is shared.
        </p>
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={() => void doExport()}>Download my progress (JSON)</button>
          <span className="muted small" role="status">{saved}</span>
        </div>
        {exportText && (
          <>
            <label htmlFor="export-text" className="field-label">Select all and copy this text into a file</label>
            <textarea id="export-text" className="mono" readOnly rows={6} value={exportText} onFocus={(e) => e.currentTarget.select()} />
          </>
        )}
        <div className="danger">
          {!confirmReset ? (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(true)}>Reset all progress&hellip;</button>
          ) : (
            <div role="alertdialog" aria-label="Confirm reset">
              <p>This clears your progress and notebook on every device. It cannot be undone.</p>
              <div className="row">
                <button type="button" className="btn btn--danger" onClick={() => { actions.resetAll(); setConfirmReset(false); }}>Yes, reset everything</button>
                <button type="button" className="btn btn--ghost" onClick={() => setConfirmReset(false)}>Keep my progress</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function noteLabel(key: string): string {
  const m = /^takeaway:r(\d\d)$/.exec(key);
  if (m) {
    const r = ROUNDS.find((x) => x.n === Number(m[1]));
    return `Round ${Number(m[1])} takeaway${r ? `: ${r.title}` : ''}`;
  }
  return key;
}
