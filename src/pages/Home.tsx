import React from 'react';
import { ROUNDS, TOTAL_ROUNDS, LINES, zoneLabel } from '../content/manifest';
import { isReady } from '../content/index';
import { useProgress } from '../state/ProgressProvider';
import { completedCount, completionTimes } from '../state/progress';
import { doneThisWeek, effectivePace, projectFinishWeek, formatWeekOf } from '../lib/pace';
import { TransitMap } from '../map/TransitMap';
import { StripMap } from '../map/StripMap';
import { Board } from '../components/Header';

export function nextRoundId(rounds: Record<string, { s: number }>): string | null {
  const r = ROUNDS.find((x) => isReady(x.id) && (rounds[x.id]?.s ?? 0) < 2);
  return r ? r.id : null;
}

export function Home() {
  const { progress } = useProgress();
  const now = new Date();
  const comps = completionTimes(progress);
  const done = completedCount(progress);
  const thisWeek = doneThisWeek(comps, now);
  const eff = effectivePace(progress.perWeek, comps, now);
  const finish = projectFinishWeek({ total: TOTAL_ROUNDS, done, perWeek: eff, doneThisWeek: thisWeek, now });
  const nextId = nextRoundId(progress.rounds);
  const next = ROUNDS.find((r) => r.id === nextId);
  const open = ROUNDS.filter((r) => isReady(r.id)).length;

  return (
    <>
      <Board line={0} bullet="M" title="Course map" right={`${done} of ${TOTAL_ROUNDS} stations`} />
      <p className="pace" data-testid="pace-line">
        {next ? <>Round {next.n} of {TOTAL_ROUNDS}</> : <>All {open} open rounds finished</>}
        {' · '}this week {thisWeek} of {progress.perWeek}
        {' · '}{done >= TOTAL_ROUNDS ? 'course finished' : <>projected finish: week of {formatWeekOf(finish)}</>}
      </p>

      {next ? (
        <section className="next" aria-label="Next round">
          <div>
            <p className="next__eyebrow">Next stop &middot; {zoneLabel(next.zone)}{next.line ? ` · Line ${next.line}, ${LINES.find((l) => l.n === next.line)!.name}` : ''}</p>
            <h2 className="next__title">Round {next.n}: {next.title}</h2>
            <p className="muted">About {next.minutes} minutes. {progress.rounds[next.id]?.s === 1 ? 'You have started this one.' : 'A short warm-up, a read, something to try, four questions and a takeaway.'}</p>
          </div>
          <a className="btn btn--big" href={`#${next.id}`}>{progress.rounds[next.id]?.s === 1 ? 'Continue' : 'Start'} round {next.n}</a>
        </section>
      ) : (
        <section className="next" aria-label="Next round">
          <p>You have finished every round that is open so far. More rounds are opening soon.</p>
        </section>
      )}

      <section aria-label="Map">
        <div className="map-wide"><TransitMap progress={progress} nextId={nextId} /></div>
        <div className="map-strip"><StripMap progress={progress} nextId={nextId} /></div>
        <ul className="legend" aria-label="Legend">
          <li><span className="legend__glyph legend__glyph--done" aria-hidden="true" /> done</li>
          <li><span className="legend__glyph legend__glyph--started" aria-hidden="true" /> in progress</li>
          <li><span className="legend__glyph legend__glyph--tested" aria-hidden="true" /> tested out</li>
          <li><span className="legend__glyph legend__glyph--ahead" aria-hidden="true" /> not started</li>
          <li><span className="legend__glyph legend__glyph--soon" aria-hidden="true" /> opening soon</li>
        </ul>
        <p className="muted small map-note">On the wide map, stops inside the dashed ring are Zone 1, the 101 rounds. Stops outside it are Zone 2, the 102 rounds. The dotted line to the bottom leads to the capstone.</p>
      </section>
    </>
  );
}
