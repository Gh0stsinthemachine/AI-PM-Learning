import type { SyncStatus } from './syncStatus';

// Keeps one private document in step with the local state.
//  - subscribes ONCE (call start() once), never from render
//  - debounces writes, and only ever has one write in flight
//  - never writes before the stored copy has been read (a change made while the first read
//    is still in flight is merged in afterwards, so another device's work is never overwritten)
//  - merges the latest remote copy in before each write
//  - writes only when the merged result differs from what is already stored,
//    which is what stops two open devices from writing back and forth forever
//  - retries once (random short delay) on `unavailable`, then waits for the next change
import { stableStringify } from '../lib/stableStringify';

export interface DocSyncOptions<T> {
  ref: DocumentReference;
  merge(a: T, b: T): T;
  migrate(raw: unknown): { state: T; readOnly: boolean };
  getLocal(): T;
  /** Called when the merged state differs from the local one (remote had something new). */
  onState(merged: T): void;
  onStatus(s: SyncStatus): void;
  debounceMs: number;
  /** Delay before the single retry. Injectable for tests. */
  retryDelayMs?: () => number;
}

export interface DocSync {
  start(): void;
  push(): void;
  stop(): void;
  /** Resolves when no write is pending or in flight. */
  idle(): Promise<void>;
}

export function createDocSync<T>(o: DocSyncOptions<T>): DocSync {
  let remote: T | null = null;
  let readOnly = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight: Promise<void> | null = null;
  let dirty = false;
  let stopped = false;
  let ready = false; // true once the stored copy has been read; never write before that
  let unsub: (() => void) | null = null;
  const eq = (a: T, b: T) => stableStringify(a) === stableStringify(b);
  const code = (e: unknown) => (typeof e === 'object' && e !== null ? (e as { code?: string }).code : undefined);

  function schedule() {
    if (stopped || readOnly) return;
    dirty = true;
    if (!ready) return; // the first snapshot decides what to write
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void write();
    }, o.debounceMs);
  }

  async function write(): Promise<void> {
    if (inflight) return; // finally{} below re-runs when dirty
    inflight = (async () => {
      let attempt = 0;
      while (!stopped) {
        dirty = false;
        const local = o.getLocal();
        const merged = remote ? o.merge(local, remote) : local;
        if (!eq(merged, local)) o.onState(merged);
        if (remote && eq(merged, remote)) {
          o.onStatus('saved');
          return;
        }
        o.onStatus('saving');
        try {
          await o.ref.set(merged as unknown as Record<string, unknown>);
          remote = merged;
          o.onStatus('saved');
          return;
        } catch (e) {
          const c = code(e);
          if (c === 'unavailable' && attempt === 0) {
            attempt = 1;
            o.onStatus('retrying');
            await new Promise((r) => setTimeout(r, (o.retryDelayMs ?? (() => 400 + Math.random() * 800))()));
            continue;
          }
          if (c === 'revoked' || c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed') {
            stopped = true;
            o.onStatus('local-only');
          } else {
            o.onStatus('error'); // quota, invalid argument, repeated outage: wait for the next change
          }
          return;
        }
      }
    })().finally(() => {
      inflight = null;
      if (dirty && !stopped) schedule();
    });
    return inflight;
  }

  return {
    start() {
      if (unsub || stopped) return;
      unsub = o.ref.onSnapshot(
        (snap) => {
          if (stopped) return;
          ready = true;
          const m = snap.exists ? o.migrate(snap.data()) : null;
          readOnly = m?.readOnly ?? false;
          remote = m && !m.readOnly ? m.state : null;
          if (readOnly) {
            o.onStatus('local-only');
            return;
          }
          const local = o.getLocal();
          const merged = remote ? o.merge(local, remote) : local;
          if (!eq(merged, local)) o.onState(merged);
          if (!remote || !eq(merged, remote)) schedule();
          else o.onStatus('saved');
        },
        (err) => {
          const c = code(err);
          if (c === 'revoked' || c === 'not_granted') {
            stopped = true;
            o.onStatus('local-only');
          } else o.onStatus('error');
        },
      );
    },
    push() {
      schedule();
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      unsub?.();
      unsub = null;
    },
    async idle() {
      while (timer || inflight) {
        if (timer) await new Promise((r) => setTimeout(r, o.debounceMs + 5));
        if (inflight) await inflight;
      }
    },
  };
}
