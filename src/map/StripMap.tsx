import React from 'react';
import { LINES, ROUNDS, roundsOnLine, zoneLabel, type Round } from '../content/manifest';
import { isReady } from '../content/index';
import type { Progress } from '../state/progress';
import { roundState, STATE_TEXT } from './status';

// The phone version of the map: one strip per line, like the diagram above a train door.
function Stop(props: { r: Round; progress: Progress; next: boolean }) {
  const { r } = props;
  const ready = isReady(r.id);
  const state = roundState(props.progress, r.id);
  const text = ready ? STATE_TEXT[state] : 'opening soon';
  const inner = (
    <>
      <span className={`stop__dot stop__dot--${ready ? state : 'soon'}`} aria-hidden="true">{r.n}</span>
      <span className="stop__name">{r.station}</span>
      <span className="stop__state">{text}{props.next ? ' (next)' : ''}</span>
    </>
  );
  const label = `Round ${r.n}, ${r.station}, ${zoneLabel(r.zone)}, ${text}`;
  return ready ? (
    <a className={'stop' + (props.next ? ' stop--next' : '')} href={`#${r.id}`} aria-label={label}>{inner}</a>
  ) : (
    <span className="stop stop--soon" role="img" aria-label={label}>{inner}</span>
  );
}

export function StripMap(props: { progress: Progress; nextId: string | null }) {
  const hub = ROUNDS.filter((r) => r.kind === 'hub' || r.kind === 'junction' || r.kind === 'terminus');
  return (
    <div className="strips">
      <section className="strip" style={{ ['--line' as string]: 'var(--ink)' }} aria-label="Hub stations">
        <h3 className="strip__title"><span className="bullet bullet--hub" aria-hidden="true">H</span> Hub stations</h3>
        <div className="strip__stops">
          {hub.map((r) => <Stop key={r.id} r={r} progress={props.progress} next={props.nextId === r.id} />)}
        </div>
      </section>
      {LINES.map((l) => (
        <section key={l.n} className="strip" style={{ ['--line' as string]: `var(--line-${l.n})`, ['--on-line' as string]: `var(--on-line-${l.n})` }} aria-label={`Line ${l.n}, ${l.name}`}>
          <h3 className="strip__title"><span className="bullet" aria-hidden="true">{l.n}</span> {l.name}</h3>
          <div className="strip__stops">
            {roundsOnLine(l.n).filter((r) => r.kind === 'line').map((r) => (
              <Stop key={r.id} r={r} progress={props.progress} next={props.nextId === r.id} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
