import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDocSync } from '../../src/runtime/docSync';
import type { SyncStatus } from '../../src/runtime/syncStatus';
import { emptyProgress, mergeProgress, migrateProgress, finishRound, type Progress } from '../../src/state/progress';

type Snap = { exists: boolean; data(): Record<string, unknown> | undefined };

function fakeRef(initial?: Progress) {
  let doc: Progress | undefined = initial;
  let listener: ((s: Snap) => void) | null = null;
  let errListener: ((e: { code: string }) => void) | null = null;
  const sets: Progress[] = [];
  const failures: Array<{ code: string }> = [];
  const snap = (): Snap => ({ exists: doc !== undefined, data: () => (doc as unknown as Record<string, unknown>) });
  const ref = {
    onSnapshot: vi.fn((next: (s: Snap) => void, err?: (e: { code: string }) => void) => {
      listener = next;
      errListener = err ?? null;
      setTimeout(() => next(snap()), 0);
      return () => { listener = null; };
    }),
    set: vi.fn(async (d: Record<string, unknown>) => {
      const f = failures.shift();
      if (f) throw f;
      doc = d as unknown as Progress;
      sets.push(doc);
    }),
  };
  return {
    ref: ref as unknown as DocumentReference,
    raw: ref,
    sets,
    failures,
    remoteWrites(p: Progress) { doc = p; listener?.(snap()); },
    fail(e: { code: string }) { errListener?.(e); },
    get doc() { return doc; },
  };
}

function setup(initialRemote: Progress | undefined, local: Progress) {
  const f = fakeRef(initialRemote);
  let current = local;
  const statuses: SyncStatus[] = [];
  const sync = createDocSync<Progress>({
    ref: f.ref,
    merge: mergeProgress,
    migrate: migrateProgress,
    getLocal: () => current,
    onState: (m) => { current = m; },
    onStatus: (s) => statuses.push(s),
    debounceMs: 1000,
    retryDelayMs: () => 500,
  });
  return { f, sync, statuses, get local() { return current; }, set local(p: Progress) { current = p; } };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('docSync', () => {
  it('creates the document when none exists, after the debounce', async () => {
    const local = finishRound(emptyProgress(), 'r01', 'done', 10);
    const t = setup(undefined, local);
    t.sync.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(t.f.sets).toHaveLength(0); // still debouncing
    await vi.advanceTimersByTimeAsync(1000);
    expect(t.f.sets).toHaveLength(1);
    expect(t.f.sets[0]!.rounds.r01!.s).toBe(3);
    expect(t.statuses.at(-1)).toBe('saved');
  });

  it('merges newer remote work into local and does not write when nothing is new', async () => {
    const remote = finishRound(emptyProgress(), 'r02', 'done', 20);
    const t = setup(remote, emptyProgress());
    t.sync.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.local.rounds.r02!.s).toBe(3);
    expect(t.f.sets).toHaveLength(0);
    expect(t.statuses.at(-1)).toBe('saved');
  });

  it('writes the union when both sides have something the other lacks', async () => {
    const remote = finishRound(emptyProgress(), 'r02', 'done', 20);
    const t = setup(remote, finishRound(emptyProgress(), 'r01', 'done', 10));
    t.sync.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(Object.keys(t.f.sets.at(-1)!.rounds).sort()).toEqual(['r01', 'r02']);
  });

  it('coalesces a burst of pushes into one write', async () => {
    const t = setup(emptyProgress(), emptyProgress());
    t.sync.start();
    await vi.advanceTimersByTimeAsync(10);
    for (let i = 1; i <= 5; i++) {
      t.local = finishRound(t.local, 'r0' + i, 'done', 100 + i);
      t.sync.push();
      await vi.advanceTimersByTimeAsync(200);
    }
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.f.sets).toHaveLength(1);
    expect(Object.keys(t.f.sets[0]!.rounds)).toHaveLength(5);
  });

  it('keeps one write in flight and follows up with the newer state', async () => {
    const t = setup(emptyProgress(), emptyProgress());
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => { release = r; });
    const original = t.f.raw.set.getMockImplementation()!;
    t.f.raw.set.mockImplementationOnce(async (d) => { await gate; return original(d); });
    t.sync.start();
    await vi.advanceTimersByTimeAsync(10);
    t.local = finishRound(t.local, 'r01', 'done', 1);
    t.sync.push();
    await vi.advanceTimersByTimeAsync(1100); // first write now blocked
    t.local = finishRound(t.local, 'r02', 'done', 2);
    t.sync.push();
    await vi.advanceTimersByTimeAsync(1100); // second timer fires while first in flight
    expect(t.f.raw.set).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(2500);
    expect(t.f.raw.set).toHaveBeenCalledTimes(2);
    expect(Object.keys(t.f.sets.at(-1)!.rounds).sort()).toEqual(['r01', 'r02']);
  });

  it('retries once after `unavailable`, then succeeds', async () => {
    const t = setup(undefined, finishRound(emptyProgress(), 'r01', 'done', 1));
    t.f.failures.push({ code: 'unavailable' });
    t.sync.start();
    await vi.advanceTimersByTimeAsync(1100);
    expect(t.statuses).toContain('retrying');
    await vi.advanceTimersByTimeAsync(600);
    expect(t.f.sets).toHaveLength(1);
    expect(t.statuses.at(-1)).toBe('saved');
  });

  it('shows an error after a repeated outage and tries again on the next change', async () => {
    const t = setup(undefined, finishRound(emptyProgress(), 'r01', 'done', 1));
    t.f.failures.push({ code: 'unavailable' }, { code: 'unavailable' });
    t.sync.start();
    await vi.advanceTimersByTimeAsync(2500);
    expect(t.statuses.at(-1)).toBe('error');
    expect(t.f.sets).toHaveLength(0);
    t.local = finishRound(t.local, 'r02', 'done', 2);
    t.sync.push();
    await vi.advanceTimersByTimeAsync(1200);
    expect(t.f.sets).toHaveLength(1);
    expect(t.statuses.at(-1)).toBe('saved');
  });

  it('does not retry a full or invalid write', async () => {
    const t = setup(undefined, finishRound(emptyProgress(), 'r01', 'done', 1));
    t.f.failures.push({ code: 'quota_exceeded' });
    t.sync.start();
    await vi.advanceTimersByTimeAsync(5000);
    expect(t.f.raw.set).toHaveBeenCalledTimes(1);
    expect(t.statuses.at(-1)).toBe('error');
  });

  it('goes local-only when access is revoked, and stops writing', async () => {
    const t = setup(undefined, finishRound(emptyProgress(), 'r01', 'done', 1));
    t.f.failures.push({ code: 'revoked' });
    t.sync.start();
    await vi.advanceTimersByTimeAsync(1100);
    expect(t.statuses.at(-1)).toBe('local-only');
    t.local = finishRound(t.local, 'r02', 'done', 2);
    t.sync.push();
    await vi.advanceTimersByTimeAsync(3000);
    expect(t.f.raw.set).toHaveBeenCalledTimes(1);
  });

  it('a change made before the first read never overwrites what is stored', async () => {
    const remote = finishRound(emptyProgress(), 'r09', 'done', 90);
    const t = setup(remote, emptyProgress());
    t.sync.start();
    t.local = finishRound(t.local, 'r01', 'done', 10); // before the first snapshot arrives
    t.sync.push();
    await vi.advanceTimersByTimeAsync(3000);
    expect(t.f.sets).toHaveLength(1);
    expect(Object.keys(t.f.sets[0]!.rounds).sort()).toEqual(['r01', 'r09']);
  });

  it('never writes over a newer schema', async () => {
    const t = setup({ v: 2, rounds: {} } as unknown as Progress, finishRound(emptyProgress(), 'r01', 'done', 1));
    t.sync.start();
    t.sync.push();
    await vi.advanceTimersByTimeAsync(5000);
    expect(t.f.raw.set).not.toHaveBeenCalled();
    expect(t.statuses.at(-1)).toBe('local-only');
  });

  it('a change from another device is merged in and not echoed back', async () => {
    const t = setup(emptyProgress(), emptyProgress());
    t.sync.start();
    await vi.advanceTimersByTimeAsync(2000);
    t.f.remoteWrites(finishRound(emptyProgress(), 'r03', 'done', 30));
    await vi.advanceTimersByTimeAsync(2000);
    expect(t.local.rounds.r03!.s).toBe(3);
    expect(t.f.raw.set).not.toHaveBeenCalled();
  });

  it('subscribes once even if start() is called twice', () => {
    const t = setup(undefined, emptyProgress());
    t.sync.start();
    t.sync.start();
    expect(t.f.raw.onSnapshot).toHaveBeenCalledTimes(1);
  });

  it('stop() unsubscribes and cancels a pending write', async () => {
    const t = setup(undefined, finishRound(emptyProgress(), 'r01', 'done', 1));
    t.sync.start();
    await vi.advanceTimersByTimeAsync(10);
    t.sync.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(t.f.raw.set).not.toHaveBeenCalled();
  });
});
