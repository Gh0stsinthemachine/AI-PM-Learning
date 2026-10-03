import React from 'react';
import { glossaryById } from '../content/glossary';
import { FigureById } from '../diagrams';
import { WidgetById } from '../widgets/registry';

// Maps the allowed MDX component names (see names.ts) to React components.

export function Term(props: { id: string; children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const g = glossaryById(props.id);
  if (!g) return <>{props.children}</>;
  return (
    <span className="term">
      <button type="button" className="term__btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {props.children}
      </button>
      {open && (
        <span className="term__def" role="note">
          <strong>{g.term}.</strong> {g.definition}
        </span>
      )}
    </span>
  );
}

const CALLOUT_LABEL: Record<string, string> = {
  gap: 'Mind the gap',
  change: 'Change here',
  notice: 'Platform notice',
  service: 'Service update',
};

export function Callout(props: { kind: string; children?: React.ReactNode }) {
  return (
    <aside className={`callout callout--${props.kind}`}>
      <span className="callout__sign">{CALLOUT_LABEL[props.kind] ?? props.kind}</span>
      <div className="callout__body">{props.children}</div>
    </aside>
  );
}

export function Widget(props: { id: string }) {
  return <WidgetById id={props.id} />;
}

export function Figure(props: { id: string }) {
  return <FigureById id={props.id} />;
}

export function LastChecked(props: { date: string }) {
  return <p className="last-checked">Last checked {props.date}. Tools, models and prices change quickly, so check the source before you rely on this.</p>;
}

export function Sources(props: { children?: React.ReactNode }) {
  return <footer className="sources">{props.children}</footer>;
}

// Lowercase element overrides: every external link opens in a new tab.
function A(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = typeof props.href === 'string' && /^https?:/.test(props.href);
  return <a {...props} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />;
}

export const mdxComponents = { Term, Callout, Widget, Figure, LastChecked, Sources, a: A };
