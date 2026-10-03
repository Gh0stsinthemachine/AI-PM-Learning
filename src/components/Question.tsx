import React from 'react';
import type { Mcq } from '../content/checks';

/** One multiple-choice question: pick, check, read why, continue. */
export function Question(props: {
  q: Mcq;
  index: number;
  total: number;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const { q } = props;
  const [picked, setPicked] = React.useState<number | null>(null);
  const [checked, setChecked] = React.useState(false);
  React.useEffect(() => {
    setPicked(null);
    setChecked(false);
  }, [q.id]);
  const correct = picked === q.answer;
  const name = `q-${q.id}`;
  return (
    <fieldset className="question" data-question={q.id}>
      <legend>
        <span className="question__count">Question {props.index + 1} of {props.total}</span>
        <span className="question__prompt">{q.prompt}</span>
      </legend>
      <div className="question__choices">
        {q.choices.map((c, i) => {
          const state = !checked ? '' : i === q.answer ? ' is-correct' : i === picked ? ' is-wrong' : '';
          return (
            <label key={i} className={'choice' + state}>
              <input type="radio" name={name} id={`${name}-${i}`} checked={picked === i} disabled={checked} onChange={() => setPicked(i)} />
              <span>{c}</span>
              {checked && i === q.answer && <span className="choice__tag">Correct</span>}
              {checked && i === picked && i !== q.answer && <span className="choice__tag">Your answer</span>}
            </label>
          );
        })}
      </div>
      {!checked ? (
        <button
          type="button"
          className="btn"
          disabled={picked === null}
          onClick={() => {
            setChecked(true);
            props.onAnswered(picked === q.answer);
          }}
        >
          Check answer
        </button>
      ) : (
        <div className="question__result" role="status">
          <p className="question__verdict">{correct ? 'Right.' : 'Not quite.'}</p>
          <p>{q.explanation}</p>
          <button type="button" className="btn" onClick={props.onNext}>
            {props.nextLabel}
          </button>
        </div>
      )}
    </fieldset>
  );
}
