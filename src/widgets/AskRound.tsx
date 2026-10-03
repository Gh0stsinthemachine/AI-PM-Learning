import React from 'react';
import type { Round } from '../content/manifest';
import { useLiveCall } from '../runtime/useLiveCall';
import { askRoundPrompt } from '../prompts';
import { LiveOutput, LIVE_NOTE } from '../components/LiveBox';
import { useLiveOffCopy } from '../components/LiveOff';

/** "Ask Claude about this round": a question box that answers at the round's level. */
export function AskRound(props: { round: Round }) {
  const live = useLiveCall();
  const offCopy = useLiveOffCopy();
  const [q, setQ] = React.useState('');
  const id = `ask-${props.round.id}`;

  if (offCopy) {
    return (
      <section className="ask" aria-label="Ask Claude about this round">
        <h3>Ask Claude about this round</h3>
        <p className="muted" data-testid="live-off">{offCopy}</p>
      </section>
    );
  }
  return (
    <section className="ask" aria-label="Ask Claude about this round">
      <h3>Ask Claude about this round</h3>
      <p className="muted">Something unfamiliar? Ask in your own words. Answers are written for where you are in the course.</p>
      <label htmlFor={id} className="field-label">Your question</label>
      <textarea id={id} rows={2} value={q} maxLength={2000} onChange={(e) => setQ(e.target.value)} placeholder="For example: what is a token, in plain English?" />
      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={!live.available || !q.trim() || live.state.status === 'thinking' || live.state.status === 'streaming'}
          onClick={() => void live.run(askRoundPrompt(props.round, q.trim()), { modelTier: 'quick' })}
        >
          Ask
        </button>
        <span className="muted small">{live.pending ? 'Connecting to Claude…' : LIVE_NOTE}</span>
      </div>
      <LiveOutput state={live.state} onStop={live.stop} label="Claude" />
    </section>
  );
}
