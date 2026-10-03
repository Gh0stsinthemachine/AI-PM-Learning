import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../../src/lib/rng';
import {
  emptyProgress, migrateProgress, mergeProgress, startRound, finishRound, recordCheck, recordAnswer,
  setPace, resetProgress, completionTimes, completedCount, type Progress,
} from '../../src/state/progress';
import { emptyNotebook, mergeNotebook, migrateNotebook, setEntry, setForm, ENTRY_MAX_CHARS, type Notebook } from '../../src/state/notebook';
import { stableStringify as S } from '../../src/lib/stableStringify';

function randomProgress(rand: () => number): Progress {
  let p = emptyProgress();
  const n = Math.floor(rand() * 6);
  for (let i = 0; i < n; i++) {
    const id = 'r0' + (1 + Math.floor(rand() * 5));
    const t = 1000 + Math.floor(rand() * 50);
    const k = Math.floor(rand() * 6);
    if (k === 0) p = startRound(p, id, t);
    else if (k === 1) p = finishRound(p, id, 'done', t);
    else if (k === 2) p = finishRound(p, id, 'tested', t);
    else if (k === 3) p = recordCheck(p, id, Math.floor(rand() * 5), 4, t);
    else if (k === 4) p = recordAnswer(p, id + '-q1', rand() > 0.5, 1 + Math.floor(rand() * 5), t);
    else p = setPace(p, 1 + Math.floor(rand() * 7), t);
  }
  if (rand() < 0.2) p = { ...p, resetAt: 1000 + Math.floor(rand() * 50) };
  return migrateProgress(p).state;
}

describe('progress merge', () => {
  it('is commutative and idempotent over random states, including resets', () => {
    const rand = mulberry32(2026);
    for (let i = 0; i < 400; i++) {
      const a = randomProgress(rand), b = randomProgress(rand);
      expect(S(mergeProgress(a, b))).toBe(S(mergeProgress(b, a)));
      expect(S(mergeProgress(a, a))).toBe(S(migrateProgress(a).state));
    }
  });
  it('is associative over random states without a reset', () => {
    // With a reset in flight, an old "done" can outrank a newer "started" before a third
    // device's reset arrives. That needs three devices and is accepted; resets are tested below.
    const rand = mulberry32(99);
    for (let i = 0; i < 400; i++) {
      const a = { ...randomProgress(rand) }, b = { ...randomProgress(rand) }, c = { ...randomProgress(rand) };
      delete a.resetAt; delete b.resetAt; delete c.resetAt;
      expect(S(mergeProgress(mergeProgress(a, b), c))).toBe(S(mergeProgress(a, mergeProgress(b, c))));
    }
  });
  it('done beats started and tested out; equal status keeps the later time', () => {
    let a = startRound(emptyProgress(), 'r01', 10);
    let b = finishRound(emptyProgress(), 'r01', 'done', 20);
    expect(mergeProgress(a, b).rounds.r01).toEqual({ s: 3, t: 20 });
    a = finishRound(emptyProgress(), 'r01', 'tested', 30);
    expect(mergeProgress(a, b).rounds.r01!.s).toBe(3);
    b = finishRound(emptyProgress(), 'r01', 'done', 50);
    expect(mergeProgress(finishRound(emptyProgress(), 'r01', 'done', 40), b).rounds.r01!.t).toBe(50);
  });
  it('keeps the best check score and the newest attempt', () => {
    const a = recordCheck(emptyProgress(), 'r01', 4, 4, 10);
    const b = recordCheck(emptyProgress(), 'r01', 2, 4, 20);
    expect(mergeProgress(a, b).checks.r01).toEqual({ best: 4, last: 2, of: 4, t: 20 });
  });
  it('question counters only grow', () => {
    const a = recordAnswer(recordAnswer(emptyProgress(), 'q', false, 1, 1), 'q', false, 2, 2);
    const b = recordAnswer(emptyProgress(), 'q', true, 3, 3);
    const m = mergeProgress(a, b).questions.q!;
    expect(m).toMatchObject({ missed: 2, seen: 2, lastSeenRound: 3 });
  });
  it('a reset wins and drops older work on both sides', () => {
    const old = finishRound(emptyProgress(), 'r01', 'done', 10);
    const reset = resetProgress(100);
    const m = mergeProgress(old, reset);
    expect(m.rounds).toEqual({});
    expect(m.resetAt).toBe(100);
    const after = finishRound(m, 'r02', 'done', 150);
    expect(mergeProgress(old, after).rounds).toEqual({ r02: { s: 3, t: 150 } });
  });
  it('pace: the newest choice wins and is clamped', () => {
    const a = setPace(emptyProgress(), 5, 10);
    const b = setPace(emptyProgress(), 2, 20);
    expect(mergeProgress(a, b).perWeek).toBe(2);
    expect(setPace(emptyProgress(), 99, 1).perWeek).toBe(14);
    expect(setPace(emptyProgress(), 0, 1).perWeek).toBe(1);
  });
  it('counts and times completions', () => {
    let p = finishRound(emptyProgress(), 'r01', 'done', 30);
    p = finishRound(p, 'r02', 'tested', 10);
    p = startRound(p, 'r03', 5);
    expect(completedCount(p)).toBe(2);
    expect(completionTimes(p)).toEqual([10, 30]);
  });
});

describe('progress migrate', () => {
  it('turns garbage into empty state', () => {
    for (const g of [null, 5, 'x', [], undefined]) expect(migrateProgress(g).state).toEqual(emptyProgress());
  });
  it('keeps a newer schema read-only', () => {
    expect(migrateProgress({ v: 2, rounds: { r01: { s: 3, t: 1 } } })).toMatchObject({ readOnly: true });
  });
  it('drops malformed entries and clamps pace', () => {
    const m = migrateProgress({ v: 1, perWeek: 400, rounds: { r01: { s: 9, t: 1 }, r02: { s: 3, t: 2 } } }).state;
    expect(m.perWeek).toBe(14);
    expect(Object.keys(m.rounds)).toEqual(['r02']);
  });
});

describe('notebook', () => {
  it('merges last-write-wins per entry and is commutative', () => {
    const a = setEntry(emptyNotebook(), 'takeaway:r01', 'old', 10);
    const b = setEntry(setEntry(emptyNotebook(), 'takeaway:r01', 'new', 20), 'takeaway:r02', 'x', 5);
    const m = mergeNotebook(a, b);
    expect(m.entries['takeaway:r01']!.text).toBe('new');
    expect(S(mergeNotebook(a, b))).toBe(S(mergeNotebook(b, a)));
  });
  it('caps entry length', () => {
    const n = setEntry(emptyNotebook(), 'k', 'x'.repeat(ENTRY_MAX_CHARS + 500), 1);
    expect(n.entries.k!.text).toHaveLength(ENTRY_MAX_CHARS);
  });
  it('does not change when nothing changed', () => {
    const n = setEntry(emptyNotebook(), 'k', 'a', 1);
    expect(setEntry(n, 'k', 'a', 99)).toBe(n);
    const f = setForm(emptyNotebook(), 'selfcheck', { a: 'x' }, 1);
    expect(setForm(f, 'selfcheck', { a: 'x' }, 9)).toBe(f);
  });
  it('migrates garbage and respects reset', () => {
    expect(migrateNotebook('nope').state).toEqual(emptyNotebook());
    const old = setEntry(emptyNotebook(), 'k', 'a', 5);
    const m = mergeNotebook(old, { ...emptyNotebook(), resetAt: 50 } as Notebook);
    expect(m.entries).toEqual({});
  });
});
