import React from 'react';

// Maps the allowed MDX component names (see names.ts) to React components.
// M0 ships plain placeholders; the real ones arrive with the round player.
export function Term(props: { id: string; children?: React.ReactNode }) {
  return <span className="term" data-term={props.id}>{props.children}</span>;
}
export function Callout(props: { kind: string; children?: React.ReactNode }) {
  return <aside className={`callout callout--${props.kind}`}>{props.children}</aside>;
}
export function Widget(props: { id: string }) {
  return <div className="widget" data-widget={props.id} />;
}
export function Figure(props: { id: string }) {
  return <figure className="figure" data-figure={props.id} />;
}
export function LastChecked(props: { date: string }) {
  return <p className="last-checked">Last checked {props.date}</p>;
}
export function Sources(props: { children?: React.ReactNode }) {
  return <footer className="sources">{props.children}</footer>;
}

export const mdxComponents = { Term, Callout, Widget, Figure, LastChecked, Sources };
