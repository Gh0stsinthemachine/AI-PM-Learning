import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { App } from './App';
import { RuntimeProvider } from './runtime/capabilities';
import { ProgressProvider } from './state/ProgressProvider';

// The viewer's hot hook keeps state across republishes. It is absent outside
// claude.ai, hence the optional chaining.
type Hot = { snapshot?: (fn: () => unknown) => void; ready?: (fn: (d: unknown) => void) => void; data?: unknown };
const hot = (window.claude as unknown as { hot?: Hot } | undefined)?.hot;

function start(data?: unknown) {
  const el = document.getElementById('root');
  if (!el) return;
  createRoot(el).render(
    <RuntimeProvider>
      <ProgressProvider>
        <App initial={(data as { route?: string } | undefined) ?? {}} />
      </ProgressProvider>
    </RuntimeProvider>,
  );
}

hot?.snapshot?.(() => ({ route: window.location.hash }));
if (hot?.ready) hot.ready(start);
else start(hot?.data);
