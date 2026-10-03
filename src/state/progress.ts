import { stableStringify } from '../lib/stableStringify';

// Two documents are synced per viewer: progress (small, written often) and the
// notebook (text Tom types). Both are plain JSON, versioned, and merged with pure
// functions so two devices can write without losing each other's work.

export type RoundStatus = 1 | 2 | 3; // 1 started, 2 tested out, 3 done

export interface RoundRecord { s: RoundStatus; t: number }
export interface CheckRecord { best: number; last: number; of: number; t: number }
export interface QuestionRecord { missed: number; seen: number; lastSeenRound?: number; t: number }
export interface ExplainRecord { verdict: 'strong' | 'partial' | 'missing' | 'self'; t: number }
export interface LastRecord { route: string; t: number }

export interface Progress {
  v: 1;
  resetAt?: number;
  perWeek: number;
  perWeekT: number;
  rounds: Record<string, RoundRecord>;
  checks: Record<string, CheckRecord>;
  questions: Record<string, QuestionRecord>;
  explain: Record<string, ExplainRecord>;
  last?: LastRecord;
}

export const DEFAULT_PER_WEEK = 3;

export function emptyProgress(): Progress {
  return { v: 1, perWeek: DEFAULT_PER_WEEK, perWeekT: 0, rounds: {}, checks: {}, questions: {}, explain: {} };
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown, fallback: number) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);

/** Reads whatever was stored. Garbage becomes empty; a newer schema is kept read-only. */
export function migrateProgress(raw: unknown): { state: Progress; readOnly: boolean } {
  if (!isObj(raw)) return { state: emptyProgress(), readOnly: false };
  if (typeof raw.v === 'number' && raw.v > 1) return { state: emptyProgress(), readOnly: true };
  const p = emptyProgress();
  p.perWeek = Math.min(14, Math.max(1, Math.round(num(raw.perWeek, DEFAULT_PER_WEEK))));
  p.perWeekT = num(raw.perWeekT, 0);
  if (typeof raw.resetAt === 'number') p.resetAt = raw.resetAt;
  if (isObj(raw.rounds)) {
    for (const [k, v] of Object.entries(raw.rounds)) {
      if (isObj(v) && (v.s === 1 || v.s === 2 || v.s === 3)) p.rounds[k] = { s: v.s, t: num(v.t, 0) };
    }
  }
  if (isObj(raw.checks)) {
    for (const [k, v] of Object.entries(raw.checks)) {
      if (isObj(v)) p.checks[k] = { best: num(v.best, 0), last: num(v.last, 0), of: num(v.of, 0), t: num(v.t, 0) };
    }
  }
  if (isObj(raw.questions)) {
    for (const [k, v] of Object.entries(raw.questions)) {
      if (isObj(v)) {
        const rec: QuestionRecord = { missed: num(v.missed, 0), seen: num(v.seen, 0), t: num(v.t, 0) };
        if (typeof v.lastSeenRound === 'number') rec.lastSeenRound = v.lastSeenRound;
        p.questions[k] = rec;
      }
    }
  }
  if (isObj(raw.explain)) {
    for (const [k, v] of Object.entries(raw.explain)) {
      if (isObj(v) && (v.verdict === 'strong' || v.verdict === 'partial' || v.verdict === 'missing' || v.verdict === 'self')) {
        p.explain[k] = { verdict: v.verdict, t: num(v.t, 0) };
      }
    }
  }
  if (isObj(raw.last) && typeof raw.last.route === 'string') p.last = { route: raw.last.route, t: num(raw.last.t, 0) };
  return { state: pruneBeforeReset(p), readOnly: false };
}

function pruneBeforeReset(p: Progress, resetAt: number | undefined = p.resetAt): Progress {
  const r = resetAt;
  if (r === undefined) return p;
  const keep = <T extends { t: number }>(m: Record<string, T>) =>
    Object.fromEntries(Object.entries(m).filter(([, v]) => v.t >= r));
  const out: Progress = {
    ...p,
    ...(r !== undefined ? { resetAt: r } : {}),
    rounds: keep(p.rounds),
    checks: keep(p.checks),
    questions: keep(p.questions),
    explain: keep(p.explain),
  };
  if (p.last && p.last.t < r) delete out.last;
  return out;
}

// Last-write-wins on `t`; ties break on the stable string so merge is commutative.
function lww<T extends { t: number }>(a: T, b: T): T {
  if (a.t !== b.t) return a.t > b.t ? a : b;
  return stableStringify(a) >= stableStringify(b) ? a : b;
}

function mergeMap<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k];
    const y = b[k];
    out[k] = x === undefined ? (y as T) : y === undefined ? x : pick(x, y);
  }
  return out;
}

/**
 * Merge two progress states. Rules:
 *  rounds: the higher status wins (done > tested out > started); equal status keeps the later time (the only choice that stays order-independent when a reset cuts between two copies)
 *  checks: best score is the max; last/of/t come from the newer attempt
 *  questions: counters only grow (max of each)
 *  explain, last, perWeek: newest write wins
 *  resetAt: the later reset wins, and anything older than it is dropped
 */
export function mergeProgress(a0: Progress, b0: Progress): Progress {
  const resetAt = a0.resetAt === undefined ? b0.resetAt : b0.resetAt === undefined ? a0.resetAt : Math.max(a0.resetAt, b0.resetAt);
  // Drop anything older than the final reset from BOTH sides first, so the merge is associative.
  const a = pruneBeforeReset(a0, resetAt);
  const b = pruneBeforeReset(b0, resetAt);
  const perWeekWinner = a.perWeekT !== b.perWeekT ? (a.perWeekT > b.perWeekT ? a : b) : a.perWeek >= b.perWeek ? a : b;
  const lastCandidates = [a.last, b.last].filter((x): x is LastRecord => x !== undefined);
  const out: Progress = {
    v: 1,
    perWeek: perWeekWinner.perWeek,
    perWeekT: Math.max(a.perWeekT, b.perWeekT),
    rounds: mergeMap(a.rounds, b.rounds, (x, y) => (x.s !== y.s ? (x.s > y.s ? x : y) : { s: x.s, t: Math.max(x.t, y.t) })),
    checks: mergeMap(a.checks, b.checks, (x, y) => {
      const newer = lww(x, y);
      return { best: Math.max(x.best, y.best), last: newer.last, of: newer.of, t: newer.t };
    }),
    questions: mergeMap(a.questions, b.questions, (x, y) => {
      const rec: QuestionRecord = { missed: Math.max(x.missed, y.missed), seen: Math.max(x.seen, y.seen), t: Math.max(x.t, y.t) };
      const ls = [x.lastSeenRound, y.lastSeenRound].filter((n): n is number => n !== undefined);
      if (ls.length) rec.lastSeenRound = Math.max(...ls);
      return rec;
    }),
    explain: mergeMap(a.explain, b.explain, lww),
  };
  if (resetAt !== undefined) out.resetAt = resetAt;
  if (lastCandidates.length) out.last = lastCandidates.reduce(lww);
  return pruneBeforeReset(out);
}

// ---- reducers (pure; each returns a new Progress) ----

export function startRound(p: Progress, id: string, now: number): Progress {
  if (p.rounds[id]) return p;
  return { ...p, rounds: { ...p.rounds, [id]: { s: 1, t: now } } };
}

export function finishRound(p: Progress, id: string, kind: 'done' | 'tested', now: number): Progress {
  const s: RoundStatus = kind === 'done' ? 3 : 2;
  const cur = p.rounds[id];
  if (cur && cur.s >= s) return p;
  return { ...p, rounds: { ...p.rounds, [id]: { s, t: now } } };
}

export function recordCheck(p: Progress, id: string, score: number, of: number, now: number): Progress {
  const cur = p.checks[id];
  return {
    ...p,
    checks: { ...p.checks, [id]: { best: Math.max(cur?.best ?? 0, score), last: score, of, t: now } },
  };
}

export function recordAnswer(p: Progress, questionId: string, correct: boolean, round: number, now: number): Progress {
  const cur = p.questions[questionId];
  const rec: QuestionRecord = {
    missed: (cur?.missed ?? 0) + (correct ? 0 : 1),
    seen: (cur?.seen ?? 0) + 1,
    lastSeenRound: round,
    t: now,
  };
  return { ...p, questions: { ...p.questions, [questionId]: rec } };
}

export function setPace(p: Progress, perWeek: number, now: number): Progress {
  const n = Math.min(14, Math.max(1, Math.round(perWeek)));
  return n === p.perWeek ? p : { ...p, perWeek: n, perWeekT: now };
}

export function setLast(p: Progress, route: string, now: number): Progress {
  return p.last?.route === route ? p : { ...p, last: { route, t: now } };
}

export function resetProgress(now: number): Progress {
  return { ...emptyProgress(), resetAt: now };
}

/** Times at which rounds were finished (done or tested out), for pace math. */
export function completionTimes(p: Progress): number[] {
  return Object.values(p.rounds).filter((r) => r.s >= 2).map((r) => r.t).sort((x, y) => x - y);
}

export function completedCount(p: Progress): number {
  return Object.values(p.rounds).filter((r) => r.s >= 2).length;
}
