import type { Progress } from '../state/progress';

export type RoundState = 'ahead' | 'started' | 'tested' | 'done';

export function roundState(p: Progress, id: string): RoundState {
  const s = p.rounds[id]?.s;
  return s === 3 ? 'done' : s === 2 ? 'tested' : s === 1 ? 'started' : 'ahead';
}

export const STATE_TEXT: Record<RoundState, string> = {
  ahead: 'not started',
  started: 'in progress',
  tested: 'tested out',
  done: 'done',
};
