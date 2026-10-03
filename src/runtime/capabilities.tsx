import React from 'react';

// Each platform capability resolves on its own. A capability is 'pending'
// until its promise settles, then 'ready' (namespace available) or 'absent'
// (null: signed out, not granted, outside claude.ai, or still unanswered
// after the platform's 10 s limit). Nothing here blocks the first paint, and
// the page works with every capability absent (for example on Vercel).
export type CapStatus = 'pending' | 'ready' | 'absent';

export interface Capabilities {
  inViewer: boolean;
  sample: { status: CapStatus; api: typeof Claude.sample | null; tools: boolean };
  db: { status: CapStatus; api: ClaudeCapabilityMap['db'] | null };
  user: { status: CapStatus; api: typeof Claude.user | null };
  downloads: { status: CapStatus; api: typeof Claude.downloads | null };
  permissions: { status: CapStatus; api: typeof Claude.permissions | null };
  /** Set when a live call reports the viewer has turned live answers off. */
  sampleOff: boolean;
  turnSampleOff: () => void;
}

const inViewer = typeof window !== 'undefined' && typeof window.claude?.use === 'function';

async function useCap<K extends keyof ClaudeCapabilityMap & string>(name: K): Promise<ClaudeCapabilityMap[K] | null> {
  if (!inViewer) return null;
  try {
    return (await window.claude.use(name)) ?? null;
  } catch {
    return null;
  }
}

const initial: Capabilities = {
  inViewer,
  sample: { status: inViewer ? 'pending' : 'absent', api: null, tools: false },
  db: { status: inViewer ? 'pending' : 'absent', api: null },
  user: { status: inViewer ? 'pending' : 'absent', api: null },
  downloads: { status: inViewer ? 'pending' : 'absent', api: null },
  permissions: { status: inViewer ? 'pending' : 'absent', api: null },
  sampleOff: false,
  turnSampleOff: () => {},
};

const Ctx = React.createContext<Capabilities>(initial);

export function useCapabilities(): Capabilities {
  return React.useContext(Ctx);
}

export function RuntimeProvider(props: { children?: React.ReactNode }) {
  const [state, setState] = React.useState<Capabilities>(initial);

  React.useEffect(() => {
    let alive = true;
    const patch = (p: Partial<Capabilities>) => alive && setState((s) => ({ ...s, ...p }));

    useCap('sample').then(async (api) => {
      let tools = false;
      if (api) {
        try {
          tools = Boolean((await api.limits()).tools);
        } catch {
          tools = false;
        }
      }
      patch({ sample: { status: api ? 'ready' : 'absent', api, tools } });
    });
    useCap('db').then((api) => patch({ db: { status: api ? 'ready' : 'absent', api } }));
    useCap('user').then((api) => patch({ user: { status: api ? 'ready' : 'absent', api } }));
    useCap('downloads').then((api) => patch({ downloads: { status: api ? 'ready' : 'absent', api } }));
    useCap('permissions').then((api) => patch({ permissions: { status: api ? 'ready' : 'absent', api } }));
    return () => {
      alive = false;
    };
  }, []);

  const turnSampleOff = React.useCallback(() => setState((s) => ({ ...s, sampleOff: true })), []);
  const value = React.useMemo(() => ({ ...state, turnSampleOff }), [state, turnSampleOff]);
  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>;
}
