import React from 'react';
import Smoke from './content/_smoke.mdx';
import { mdxComponents } from './mdx/registry';
import { useCapabilities } from './runtime/capabilities';

export function App(props: { initial?: { route?: string } }) {
  const caps = useCapabilities();
  const label = (s: string) => s;
  return (
    <main className="app">
      <header className="board" style={{ ['--line' as string]: 'var(--line-1)' }}>
        <span className="board__bullet" aria-hidden="true">1</span>
        <h1 className="board__name" style={{ fontSize: 'var(--step-2)' }}>AI PM 102</h1>
        <span className="board__zone">Zone 1 · build skeleton</span>
      </header>
      <section aria-label="Smoke test">
        <Smoke components={mdxComponents} />
      </section>
      <dl className="probe" aria-label="Runtime capabilities">
        <dt>Inside claude.ai</dt>
        <dd data-probe="viewer">{caps.inViewer ? 'yes' : 'no'}</dd>
        <dt>Live answers (sample)</dt>
        <dd data-probe="sample">{label(caps.sample.status)}</dd>
        <dt>Saved progress (db)</dt>
        <dd data-probe="db">{label(caps.db.status)}</dd>
        <dt>Downloads</dt>
        <dd data-probe="downloads">{label(caps.downloads.status)}</dd>
      </dl>
      <p hidden>{props.initial?.route}</p>
    </main>
  );
}
