import React from 'react';
import type { LiveState } from '../runtime/useLiveCall';

export const LIVE_NOTE = 'Uses your Claude plan. The first time, Claude asks you to allow this page.';

/** Shared view of one live call: Thinking, streaming text, Stop, errors. */
export function LiveOutput(props: { state: LiveState; onStop: () => void; label: string }) {
  const { state } = props;
  if (state.status === 'idle') return null;
  const busy = state.status === 'thinking' || state.status === 'streaming';
  return (
    <div className="live" aria-busy={busy}>
      <div className="live__head">
        <span className="live__label">{props.label}</span>
        {busy && (
          <button type="button" className="btn btn--small" onClick={props.onStop}>
            Stop
          </button>
        )}
      </div>
      {state.status === 'thinking' && <p className="live__thinking" role="status">Thinking&hellip;</p>}
      {state.text && <div className="live__text" data-testid="live-text">{state.text}</div>}
      {state.stopped && <p className="live__note" role="status">Stopped.</p>}
      {state.truncated && <p className="live__note">The answer was cut short. Ask for less at a time.</p>}
      {state.tierNote && <p className="live__note">{state.tierNote}</p>}
      {state.error && (
        <p className="live__error" role="alert" data-testid="live-error">
          {state.error.copy}
        </p>
      )}
      {state.status === 'done' && !state.stopped && <p className="visually-hidden" role="status">Answer finished.</p>}
    </div>
  );
}
