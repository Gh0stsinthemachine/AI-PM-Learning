import React from 'react';
import { useCapabilities } from './capabilities';
import { classifySampleError, partialText, type ClassifiedError } from './sampleErrors';

export type LiveStatus = 'idle' | 'thinking' | 'streaming' | 'done' | 'error';

export interface LiveState {
  status: LiveStatus;
  text: string;
  error: ClassifiedError | null;
  truncated: boolean;
  stopped: boolean;
  tierNote: string;
}

const IDLE: LiveState = { status: 'idle', text: '', error: null, truncated: false, stopped: false, tierNote: '' };

export interface RunOptions {
  modelTier?: 'quick' | 'default' | 'complex';
  /** Pass false for anything that must produce a new answer each time. */
  cache?: boolean;
}

/**
 * One live call at a time. Rules it enforces:
 *  - only ever runs from a click (the caller decides; there is no auto-run)
 *  - "Thinking..." until the first text arrives
 *  - a NEW AbortController per call; unmount and Stop both abort it
 *  - never retries by itself
 */
export function useLiveCall() {
  const caps = useCapabilities();
  const [state, setState] = React.useState<LiveState>(IDLE);
  const ctl = React.useRef<AbortController | null>(null);
  const alive = React.useRef(true);

  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ctl.current?.abort();
    };
  }, []);

  const available = caps.sample.status === 'ready' && caps.sample.api !== null && !caps.sampleOff;
  const pending = caps.sample.status === 'pending';

  const run = React.useCallback(
    async (input: string, opts: RunOptions = {}): Promise<string | null> => {
      const api = caps.sample.api;
      if (!api || caps.sampleOff) return null;
      ctl.current?.abort();
      const c = new AbortController();
      ctl.current = c;
      const set = (s: LiveState) => alive.current && ctl.current === c && setState(s);
      set({ ...IDLE, status: 'thinking' });
      try {
        const callOpts: Parameters<typeof api>[1] = {
          signal: c.signal,
          onText: ({ text }) => set({ ...IDLE, status: 'streaming', text }),
        };
        if (opts.modelTier) callOpts.modelTier = opts.modelTier;
        if (opts.cache === false) callOpts.cache = false;
        const r = await api(input, callOpts);
        const tierNote = opts.modelTier && r.modelTierApplied !== opts.modelTier ? `Answered by the ${r.modelTierApplied} model.` : '';
        set({ ...IDLE, status: 'done', text: r.text, truncated: r.truncated, tierNote });
        return r.text;
      } catch (e) {
        const err = classifySampleError(e);
        if (err.kind === 'bug') console.error('sample call failed:', e);
        if (err.kind === 'hide') caps.turnSampleOff();
        const text = err.kind === 'tell' && err.code !== 'refused' || err.kind === 'silent' ? partialText(e) : '';
        if (err.kind === 'silent') set({ ...IDLE, status: 'done', text, stopped: true });
        else set({ ...IDLE, status: 'error', text, error: err });
        return null;
      }
    },
    [caps],
  );

  const stop = React.useCallback(() => ctl.current?.abort(), []);
  const reset = React.useCallback(() => {
    ctl.current?.abort();
    setState(IDLE);
  }, []);

  return { state, run, stop, reset, available, pending };
}
