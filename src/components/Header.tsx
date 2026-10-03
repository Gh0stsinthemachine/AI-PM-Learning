import React from 'react';
import { useProgress } from '../state/ProgressProvider';
import type { Route } from '../router';

export function Header(props: { route: Route }) {
  const { sync, syncCopy } = useProgress();
  const current = props.route.name;
  return (
    <header className="topbar">
      <a className="topbar__brand" href="#home" aria-label="AI PM 102, home">
        <span className="topbar__bullet" aria-hidden="true">102</span>
        <span className="topbar__name">AI PM 102</span>
      </a>
      <nav className="topbar__nav" aria-label="Main">
        <a href="#home" aria-current={current === 'home' ? 'page' : undefined}>Map</a>
        <a href="#journey" aria-current={current === 'journey' ? 'page' : undefined}>Journey</a>
        <a href="#about" aria-current={current === 'about' ? 'page' : undefined}>About</a>
      </nav>
      <span className={`chip-sync chip-sync--${sync}`} role="status" data-testid="sync-chip">{syncCopy}</span>
    </header>
  );
}

/** Station-name board used as the page heading. */
export function Board(props: { line: number; bullet: string; title: string; right?: string; headingRef?: React.Ref<HTMLHeadingElement> }) {
  return (
    <div className="board" style={{ ['--line' as string]: props.line ? `var(--line-${props.line})` : 'var(--ink-2)', ['--on-line' as string]: props.line ? `var(--on-line-${props.line})` : 'var(--bg)' }}>
      <span className="board__bullet" aria-hidden="true">{props.bullet}</span>
      <h1 className="board__name" ref={props.headingRef} tabIndex={-1}>{props.title}</h1>
      {props.right && <span className="board__zone">{props.right}</span>}
    </div>
  );
}
