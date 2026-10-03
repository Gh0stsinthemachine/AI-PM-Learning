import React from 'react';
import { useCapabilities } from '../runtime/capabilities';
import { storageGet, storageSet } from '../runtime/storage';
import { createDocSync, type DocSync } from '../runtime/docSync';
import { SYNC_COPY, type SyncStatus } from '../runtime/syncStatus';
import * as P from './progress';
import * as N from './notebook';
import type { FormValue } from './notebook';

export interface Actions {
  startRound(id: string): void;
  finishRound(id: string, kind: 'done' | 'tested'): void;
  recordCheck(id: string, score: number, of: number): void;
  recordAnswer(questionId: string, correct: boolean, round: number): void;
  setPace(perWeek: number): void;
  setLast(route: string): void;
  setEntry(key: string, text: string): void;
  setForm(key: string, fields: Record<string, FormValue>): void;
  resetAll(): void;
}

export interface ProgressContext {
  progress: P.Progress;
  notebook: N.Notebook;
  sync: SyncStatus;
  syncCopy: string;
  actions: Actions;
}

const Ctx = React.createContext<ProgressContext | null>(null);

export function useProgress(): ProgressContext {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('useProgress outside ProgressProvider');
  return c;
}

function readCache<T>(key: string, migrate: (raw: unknown) => { state: T }, empty: () => T): T {
  const raw = storageGet(key);
  if (!raw) return empty();
  try {
    return migrate(JSON.parse(raw)).state;
  } catch {
    return empty();
  }
}

const worse = (a: SyncStatus, b: SyncStatus): SyncStatus => {
  const order: SyncStatus[] = ['error', 'retrying', 'saving', 'loading', 'local-only', 'saved'];
  return order.indexOf(a) <= order.indexOf(b) ? a : b;
};

export function ProgressProvider(props: { children?: React.ReactNode }) {
  const caps = useCapabilities();
  const [progress, setProgress] = React.useState<P.Progress>(() => readCache('progress', P.migrateProgress, P.emptyProgress));
  const [notebook, setNotebook] = React.useState<N.Notebook>(() => readCache('notebook', N.migrateNotebook, N.emptyNotebook));
  const pRef = React.useRef(progress);
  const nRef = React.useRef(notebook);
  const pSync = React.useRef<DocSync | null>(null);
  const nSync = React.useRef<DocSync | null>(null);
  const [pStatus, setPStatus] = React.useState<SyncStatus>('loading');
  const [nStatus, setNStatus] = React.useState<SyncStatus>('loading');

  const applyP = React.useCallback((next: P.Progress) => {
    pRef.current = next;
    setProgress(next);
    storageSet('progress', JSON.stringify(next));
  }, []);
  const applyN = React.useCallback((next: N.Notebook) => {
    nRef.current = next;
    setNotebook(next);
    storageSet('notebook', JSON.stringify(next));
  }, []);

  // Subscribe to the two private documents once, when the database and the viewer id are known.
  const db = caps.db.api;
  const userApi = caps.user.api;
  const dbStatus = caps.db.status;
  const userStatus = caps.user.status;
  React.useEffect(() => {
    if (dbStatus === 'absent' || userStatus === 'absent') {
      setPStatus('local-only');
      setNStatus('local-only');
      return;
    }
    if (!db || !userApi) return;
    let cancelled = false;
    let stops: Array<() => void> = [];
    void (async () => {
      let uid: string | null = null;
      try {
        uid = await userApi.id();
      } catch {
        uid = null;
      }
      if (cancelled) return;
      if (!uid) {
        setPStatus('local-only');
        setNStatus('local-only');
        return;
      }
      const base = `data/users/${uid}`;
      const ps = createDocSync<P.Progress>({
        ref: db.doc(`${base}/progress`),
        merge: P.mergeProgress,
        migrate: P.migrateProgress,
        getLocal: () => pRef.current,
        onState: applyP,
        onStatus: setPStatus,
        debounceMs: 1000,
      });
      const ns = createDocSync<N.Notebook>({
        ref: db.doc(`${base}/notebook`),
        merge: N.mergeNotebook,
        migrate: N.migrateNotebook,
        getLocal: () => nRef.current,
        onState: applyN,
        onStatus: setNStatus,
        debounceMs: 2000,
      });
      pSync.current = ps;
      nSync.current = ns;
      ps.start();
      ns.start();
      stops = [() => ps.stop(), () => ns.stop()];
    })();
    return () => {
      cancelled = true;
      stops.forEach((s) => s());
      pSync.current = null;
      nSync.current = null;
    };
  }, [db, userApi, dbStatus, userStatus, applyP, applyN]);

  // Flush quickly when the page is hidden or closed.
  React.useEffect(() => {
    const flush = () => {
      pSync.current?.push();
      nSync.current?.push();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const actions = React.useMemo<Actions>(() => {
    const ap = (fn: (p: P.Progress) => P.Progress) => {
      const next = fn(pRef.current);
      if (next === pRef.current) return;
      applyP(next);
      pSync.current?.push();
    };
    const an = (fn: (n: N.Notebook) => N.Notebook) => {
      const next = fn(nRef.current);
      if (next === nRef.current) return;
      applyN(next);
      nSync.current?.push();
    };
    return {
      startRound: (id) => ap((p) => P.startRound(p, id, Date.now())),
      finishRound: (id, kind) => ap((p) => P.finishRound(p, id, kind, Date.now())),
      recordCheck: (id, score, of) => ap((p) => P.recordCheck(p, id, score, of, Date.now())),
      recordAnswer: (q, ok, round) => ap((p) => P.recordAnswer(p, q, ok, round, Date.now())),
      setPace: (n) => ap((p) => P.setPace(p, n, Date.now())),
      setLast: (route) => ap((p) => P.setLast(p, route, Date.now())),
      setEntry: (key, text) => an((n) => N.setEntry(n, key, text, Date.now())),
      setForm: (key, fields) => an((n) => N.setForm(n, key, fields, Date.now())),
      resetAll: () => {
        const now = Date.now();
        applyP(P.resetProgress(now));
        applyN(N.resetNotebook(now));
        pSync.current?.push();
        nSync.current?.push();
      },
    };
  }, [applyP, applyN]);

  const sync = worse(pStatus, nStatus);
  const value = React.useMemo<ProgressContext>(
    () => ({ progress, notebook, sync, syncCopy: SYNC_COPY[sync], actions }),
    [progress, notebook, sync, actions],
  );
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}
