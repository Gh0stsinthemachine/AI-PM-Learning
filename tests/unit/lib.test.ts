import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../../src/lib/rng';
import { softmax, sampleIndex } from '../../src/lib/softmax';
import { estimateTokens, tokenCost, wordCount } from '../../src/lib/tokens';
import { weekStart, doneThisWeek, projectFinishWeek, effectivePace, addWeeks } from '../../src/lib/pace';
import { pickWarmup } from '../../src/lib/review';
import { stableStringify } from '../../src/lib/stableStringify';

describe('rng', () => {
  it('is deterministic and in [0,1)', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('softmax', () => {
  const z = [3, 2.2, 1.4, 0.9, 0.2];
  it('sums to 1', () => {
    for (const t of [0.1, 0.5, 1, 2]) expect(softmax(z, t).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it('matches the textbook value at T=1', () => {
    const p = softmax([1, 2, 3], 1);
    const denom = Math.exp(1) + Math.exp(2) + Math.exp(3);
    expect(p[2]).toBeCloseTo(Math.exp(3) / denom, 10);
  });
  it('low temperature sharpens, high flattens', () => {
    expect(softmax(z, 0.2)[0]!).toBeGreaterThan(softmax(z, 1)[0]!);
    expect(softmax(z, 2)[0]!).toBeLessThan(softmax(z, 1)[0]!);
  });
  it('is stable with huge scores', () => {
    const p = softmax([1000, 999, 998], 1);
    expect(p.every(Number.isFinite)).toBe(true);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it('near zero temperature picks the top word, ties to the lowest index', () => {
    expect(softmax([1, 3, 3], 0.01)).toEqual([0, 1, 0]);
  });
  it('sampleIndex follows the cumulative distribution and survives drift', () => {
    const p = [0.5, 0.3, 0.2];
    expect(sampleIndex(p, 0)).toBe(0);
    expect(sampleIndex(p, 0.49)).toBe(0);
    expect(sampleIndex(p, 0.5)).toBe(1);
    expect(sampleIndex(p, 0.85)).toBe(2);
    expect(sampleIndex([0.3, 0.3, 0], 0.9999)).toBe(1);
  });
  it('sampled frequencies approach the probabilities', () => {
    const rand = mulberry32(7);
    const p = softmax(z, 1);
    const counts = z.map(() => 0);
    const N = 20000;
    for (let i = 0; i < N; i++) counts[sampleIndex(p, rand())]!++;
    p.forEach((pi, i) => expect(counts[i]! / N).toBeCloseTo(pi, 1));
  });
});

describe('tokens', () => {
  it('estimates about 4 characters per token', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
  });
  it('counts words', () => {
    expect(wordCount('  two  words ')).toBe(2);
    expect(wordCount('')).toBe(0);
  });
  it('computes cost and guards bad input', () => {
    expect(tokenCost(1_000_000, 3)).toBeCloseTo(3, 10);
    expect(tokenCost(500, 3)).toBeCloseTo(0.0015, 10);
    expect(tokenCost(-5, 3)).toBe(0);
    expect(tokenCost(10, NaN)).toBe(0);
  });
});

describe('pace', () => {
  const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h);
  it('weeks start on Monday', () => {
    expect(weekStart(d(2026, 10, 3))).toEqual(d(2026, 9, 28, 0)); // Saturday
    expect(weekStart(d(2026, 10, 5))).toEqual(d(2026, 10, 5, 0)); // Monday
    expect(weekStart(d(2026, 10, 11))).toEqual(d(2026, 10, 5, 0)); // Sunday
  });
  it('counts only this week', () => {
    const now = d(2026, 10, 7);
    const times = [d(2026, 10, 4).getTime(), d(2026, 10, 5).getTime(), d(2026, 10, 6).getTime(), d(2026, 10, 12).getTime()];
    expect(doneThisWeek(times, now)).toBe(2);
  });
  it('29 rounds at 3 a week from Mon Oct 5 2026 finishes the week of Dec 7', () => {
    const finish = projectFinishWeek({ total: 29, done: 0, perWeek: 3, doneThisWeek: 0, now: d(2026, 10, 5) });
    expect(finish).toEqual(d(2026, 12, 7, 0));
  });
  it('rounds already done this week use the quota', () => {
    const f = projectFinishWeek({ total: 29, done: 3, perWeek: 3, doneThisWeek: 3, now: d(2026, 10, 7) });
    expect(f).toEqual(d(2026, 12, 7, 0)); // 26 left, 9 whole weeks after this one
    // 27 left: 1 more this week (quota 3), then 26 => 9 whole weeks
    const g = projectFinishWeek({ total: 29, done: 2, perWeek: 3, doneThisWeek: 2, now: d(2026, 10, 7) });
    expect(g).toEqual(d(2026, 12, 7, 0));
    // 25 left: 2 more this week, then 23 => 8 whole weeks
    const h = projectFinishWeek({ total: 29, done: 4, perWeek: 3, doneThisWeek: 1, now: d(2026, 10, 7) });
    expect(h).toEqual(d(2026, 11, 30, 0));
  });
  it('finishing this week when everything left fits', () => {
    expect(projectFinishWeek({ total: 29, done: 28, perWeek: 3, doneThisWeek: 1, now: d(2026, 12, 2) })).toEqual(d(2026, 11, 30, 0));
    expect(projectFinishWeek({ total: 29, done: 29, perWeek: 3, doneThisWeek: 0, now: d(2026, 12, 2) })).toEqual(d(2026, 11, 30, 0));
  });
  it('uses the chosen pace until there are two full weeks of history', () => {
    const now = d(2026, 10, 14);
    expect(effectivePace(3, [], now)).toBe(3);
    expect(effectivePace(3, [d(2026, 10, 6).getTime()], now)).toBe(3);
  });
  it('switches to the recent average after two full weeks', () => {
    const now = d(2026, 10, 21); // week of Oct 19
    const times = [d(2026, 10, 6), d(2026, 10, 7), d(2026, 10, 8), d(2026, 10, 13)].map((x) => x.getTime());
    // full weeks: Oct 5 (3 rounds), Oct 12 (1 round) => average 2
    expect(effectivePace(3, times, now)).toBe(2);
  });
  it('addWeeks crosses month ends', () => {
    expect(addWeeks(d(2026, 10, 26, 0), 1)).toEqual(d(2026, 11, 2, 0));
  });
});

describe('warm-up picker', () => {
  const cands = [
    { id: 'r01-q1', round: 1 }, { id: 'r01-q2', round: 1 },
    { id: 'r02-q1', round: 2 }, { id: 'r02-q2', round: 2 },
    { id: 'r03-q1', round: 3 },
  ];
  it('only picks from earlier rounds', () => {
    const r = pickWarmup({ candidates: cands, records: {}, currentRound: 2 });
    expect(r.every((c) => c.round < 2)).toBe(true);
    expect(pickWarmup({ candidates: cands, records: {}, currentRound: 1 })).toEqual([]);
  });
  it('is deterministic and prefers missed questions', () => {
    const records = { 'r01-q2': { missed: 2, seen: 2, lastSeenRound: 1 } };
    const a = pickWarmup({ candidates: cands, records, currentRound: 5 });
    const b = pickWarmup({ candidates: cands, records, currentRound: 5 });
    expect(a).toEqual(b);
    expect(a[0]!.id).toBe('r01-q2');
  });
  it('draws from different rounds when it can', () => {
    const r = pickWarmup({ candidates: cands, records: {}, currentRound: 5 });
    expect(new Set(r.map((c) => c.round)).size).toBe(2);
  });
  it('does not repeat a question shown within 3 rounds when others exist', () => {
    const records = { 'r01-q1': { missed: 5, seen: 5, lastSeenRound: 4 } };
    const r = pickWarmup({ candidates: cands, records, currentRound: 5 });
    expect(r.map((c) => c.id)).not.toContain('r01-q1');
  });
  it('falls back to recently seen questions when there is nothing else', () => {
    const only = [{ id: 'a', round: 1 }];
    const r = pickWarmup({ candidates: only, records: { a: { missed: 1, seen: 1, lastSeenRound: 2 } }, currentRound: 3 });
    expect(r).toHaveLength(1);
  });
});

describe('stableStringify', () => {
  it('ignores key order and undefined', () => {
    expect(stableStringify({ b: 1, a: [1, { d: 1, c: 2 }], z: undefined })).toBe(stableStringify({ a: [1, { c: 2, d: 1 }], b: 1 }));
  });
});
