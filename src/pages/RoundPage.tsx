import React from 'react';
import { roundById, LINES, ROUNDS, zoneLabel, TOTAL_ROUNDS, type Round } from '../content/manifest';
import { CHECKS, checkForRound, type Mcq } from '../content/checks';
import { roundContent, isReady } from '../content/index';
import { mdxComponents } from '../mdx/registry';
import { Board } from '../components/Header';
import { Question } from '../components/Question';
import { useProgress } from '../state/ProgressProvider';
import { completionTimes } from '../state/progress';
import { doneThisWeek } from '../lib/pace';
import { pickWarmup, type Candidate } from '../lib/review';
import { WidgetById } from '../widgets/registry';
import { AskRound } from '../widgets/AskRound';

type Step = 'intro' | 'warmup' | 'learn' | 'try' | 'check' | 'wrap' | 'complete';

const STEP_LABEL: Record<string, { name: string; min: number }> = {
  warmup: { name: 'Warm-up', min: 2 },
  learn: { name: 'Learn', min: 8 },
  try: { name: 'Try it', min: 6 },
  check: { name: 'Check', min: 3 },
  wrap: { name: 'Wrap', min: 1 },
};

function questionById(id: string): Mcq | undefined {
  for (const c of CHECKS) {
    const q = c.questions.find((x) => x.id === id);
    if (q) return q;
  }
  return undefined;
}

/** A run of multiple-choice questions, one at a time, with a score at the end. */
function Quiz(props: { questions: Mcq[]; round: number; onFinish: (score: number) => void; finishLabel: string; heading: string }) {
  const { actions } = useProgress();
  const [i, setI] = React.useState(0);
  const score = React.useRef(0);
  const q = props.questions[i];
  if (!q) return null;
  const last = i === props.questions.length - 1;
  return (
    <div>
      <h2 className="step-title">{props.heading}</h2>
      <Question
        key={q.id}
        q={q}
        index={i}
        total={props.questions.length}
        nextLabel={last ? props.finishLabel : 'Next question'}
        onAnswered={(ok) => {
          if (ok) score.current += 1;
          actions.recordAnswer(q.id, ok, props.round);
        }}
        onNext={() => (last ? props.onFinish(score.current) : setI(i + 1))}
      />
    </div>
  );
}

export function RoundPage(props: { id: string }) {
  const round = roundById(props.id);
  const { progress, notebook, actions } = useProgress();
  const [step, setStep] = React.useState<Step>('intro');
  const [testOut, setTestOut] = React.useState(false);
  const [outcome, setOutcome] = React.useState<'tested' | 'retry' | 'done' | null>(null);
  const [warm, setWarm] = React.useState<Mcq[]>([]);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const topRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setStep('intro');
    setTestOut(false);
    setOutcome(null);
    setWarm([]);
  }, [props.id]);

  React.useEffect(() => {
    topRef.current?.scrollIntoView?.({ block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, props.id]);

  if (!round || !isReady(round.id)) {
    return (
      <>
        <Board line={0} bullet="?" title="Opening soon" />
        <p>This round is not open yet.</p>
        <a className="btn" href="#home">Back to the map</a>
      </>
    );
  }
  const Content = roundContent(round.id)!;
  const check = checkForRound(round.n);
  const status = progress.rounds[round.id]?.s ?? 0;
  const line = LINES.find((l) => l.n === round.line);
  const nextRound = ROUNDS.find((r) => r.n > round.n && isReady(r.id) && (progress.rounds[r.id]?.s ?? 0) < 2);

  const begin = (skipWarm = false) => {
    actions.startRound(round.id);
    actions.setLast(round.id);
    const candidates: Candidate[] = CHECKS.filter((c) => c.round < round.n && (progress.rounds['r' + String(c.round).padStart(2, '0')]?.s ?? 0) >= 2)
      .flatMap((c) => c.questions.map((q) => ({ id: q.id, round: c.round })));
    const picked = skipWarm ? [] : pickWarmup({ candidates, records: progress.questions, currentRound: round.n });
    const qs = picked.map((c) => questionById(c.id)).filter((q): q is Mcq => !!q);
    setWarm(qs);
    setStep(qs.length ? 'warmup' : 'learn');
  };

  const steps: Step[] = [...(warm.length ? (['warmup'] as Step[]) : []), 'learn', 'try', 'check', 'wrap'];
  const now = new Date();
  const thisWeek = doneThisWeek(completionTimes(progress), now);

  const finishCheck = (score: number) => {
    if (!check) return;
    actions.recordCheck(round.id, score, check.questions.length);
    if (testOut) {
      if (score === check.questions.length) {
        actions.finishRound(round.id, 'tested');
        setOutcome('tested');
        setStep('complete');
      } else {
        setTestOut(false);
        setOutcome('retry');
        begin();
      }
    } else {
      setStep('wrap');
    }
  };

  const takeawayKey = `takeaway:${round.id}`;

  return (
    <div ref={topRef}>
      <Board line={round.line} bullet={String(round.n)} title={round.title} right={`${zoneLabel(round.zone)}${line ? ` · ${line.name}` : ''}`} headingRef={headingRef} />

      {step !== 'intro' && step !== 'complete' && (
        <ol className="steps" aria-label="Steps in this round">
          {steps.map((s) => (
            <li key={s} aria-current={s === step ? 'step' : undefined} className={s === step ? 'is-current' : steps.indexOf(s) < steps.indexOf(step) ? 'is-past' : ''}>
              {STEP_LABEL[s]!.name} <span className="muted">{s === 'wrap' && round.n === 1 ? 3 : STEP_LABEL[s]!.min} min</span>
            </li>
          ))}
        </ol>
      )}

      {step === 'intro' && (
        <section className="intro" data-step="intro">
          <p className="lead">About {round.minutes} minutes. {status >= 2 ? (status === 3 ? 'You have finished this round. You can go through it again any time.' : 'You tested out of this round. You can read it any time.') : ''}</p>
          <ol className="plan">
            {round.n > 1 && <li><strong>Warm-up, 2 min.</strong> Two questions from earlier rounds.</li>}
            <li><strong>Learn, 8 min.</strong> A short read with one picture.</li>
            <li><strong>Try it, 6 min.</strong> Something hands-on.</li>
            <li><strong>Check, 3 min.</strong> {check?.questions.length ?? 4} quick questions.</li>
            <li><strong>Wrap, {round.n === 1 ? '3' : '1'} min.</strong> {round.n === 1 ? 'A quick "where are you now?" and a one-line takeaway.' : 'A one-line takeaway for your notebook.'}</li>
          </ol>
          <div className="row">
            <button type="button" className="btn btn--big" onClick={() => begin()}>{status === 1 ? 'Continue' : 'Start the round'}</button>
            {round.zone === 1 && status < 2 && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  actions.startRound(round.id);
                  setTestOut(true);
                  setStep('check');
                }}
              >
                Already know this? Take the check first
              </button>
            )}
          </div>
          {round.zone === 1 && status < 2 && <p className="muted small">Answer all {check?.questions.length ?? 4} correctly and this round is marked tested out. Otherwise you will go through it normally.</p>}
        </section>
      )}

      {step === 'warmup' && (
        <section data-step="warmup">
          {outcome === 'retry' && <p className="notice" role="status">That was not 4 of 4, so here is the full round. No harm done.</p>}
          <Quiz questions={warm} round={round.n} heading="Warm-up: from earlier rounds" finishLabel="On to the lesson" onFinish={() => setStep('learn')} />
        </section>
      )}

      {step === 'learn' && (
        <section data-step="learn" className="lesson">
          {outcome === 'retry' && warm.length === 0 && <p className="notice" role="status">That was not 4 of 4, so here is the full round. No harm done.</p>}
          <Content components={mdxComponents} />
          <AskRound round={round} />
          <div className="row"><button type="button" className="btn btn--big" onClick={() => setStep('try')}>On to: try it</button></div>
        </section>
      )}

      {step === 'try' && (
        <section data-step="try">
          <h2 className="step-title">Try it</h2>
          <WidgetById id={round.widget} />
          <div className="row"><button type="button" className="btn btn--big" onClick={() => setStep('check')}>On to: the check</button></div>
        </section>
      )}

      {step === 'check' && check && (
        <section data-step="check">
          {testOut && <p className="notice">Test-out: answer all {check.questions.length} correctly and you can skip this round.</p>}
          <Quiz questions={check.questions} round={round.n} heading="Check" finishLabel={testOut ? 'See my result' : 'Finish the check'} onFinish={finishCheck} />
        </section>
      )}

      {step === 'wrap' && check && (
        <section data-step="wrap">
          <h2 className="step-title">Wrap</h2>
          <p className="muted">Score on the check: {progress.checks[round.id]?.last ?? 0} of {progress.checks[round.id]?.of ?? check.questions.length}.</p>
          {round.n === 1 && <WidgetById id="self-check" />}
          <label htmlFor="takeaway" className="field-label">{check.takeawayPrompt}</label>
          <textarea id="takeaway" rows={3} maxLength={600} value={notebook.entries[takeawayKey]?.text ?? ''} onChange={(e) => actions.setEntry(takeawayKey, e.target.value)} />
          <p className="muted small">Saved to your notebook as you type.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn--big"
              onClick={() => {
                actions.finishRound(round.id, 'done');
                setOutcome('done');
                setStep('complete');
              }}
            >
              Finish round {round.n}
            </button>
          </div>
        </section>
      )}

      {step === 'complete' && (
        <section data-step="complete" className="complete">
          <h2 className="step-title">{outcome === 'tested' ? 'Tested out' : 'Round complete'}</h2>
          <p>
            {outcome === 'tested'
              ? `You answered every question correctly, so Round ${round.n} is marked tested out. You can still read it any time.`
              : `Round ${round.n} is done. That is ${doneCount(progress)} of ${TOTAL_ROUNDS} stations.`}
          </p>
          <p className="muted" data-testid="week-line">This week: {thisWeek} of {progress.perWeek} rounds.</p>
          <div className="row">
            {nextRound ? <a className="btn btn--big" href={`#${nextRound.id}`}>Next: round {nextRound.n}, {nextRound.title}</a> : <p>That is every round that is open so far. More are opening soon.</p>}
            <a className="btn btn--ghost" href="#home">Back to the map</a>
            {outcome === 'tested' && <button type="button" className="btn btn--ghost" onClick={() => { setOutcome(null); begin(true); }}>Read it anyway</button>}
          </div>
        </section>
      )}
    </div>
  );
}

function doneCount(p: { rounds: Record<string, { s: number }> }): number {
  return Object.values(p.rounds).filter((r) => r.s >= 2).length;
}
