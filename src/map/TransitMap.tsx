import React from 'react';
import { LINES, ROUNDS, type Round } from '../content/manifest';
import { isReady } from '../content/index';
import type { Progress } from '../state/progress';
import { roundState, STATE_TEXT, type RoundState } from './status';

// A radial transit map: nine lines are spokes, Central is the hub, Zone 1 stations sit inside the
// dashed ring and Zone 2 stations outside it. Status is drawn as a badge AND written in the
// accessible name, never colour alone.
const C = 440;
const R_Z1 = 150;
const R_Z2A = 250;
const R_Z2B = 340;
const R_BOUNDARY = 200;
const R_OUTER = 388;

const angle = (line: number) => ((-90 + (line - 1) * 40) * Math.PI) / 180;
const polar = (line: number, r: number) => ({ x: C + r * Math.cos(angle(line)), y: C + r * Math.sin(angle(line)) });

export function stationPosition(r: Round): { x: number; y: number } {
  if (r.kind === 'hub') return { x: C, y: C };
  if (r.kind === 'terminus') return { x: C, y: C + 410 };
  if (r.kind === 'junction') return polar(1, R_Z1);
  const sameLine = ROUNDS.filter((x) => x.line === r.line && x.kind === 'line').sort((a, b) => a.n - b.n);
  const idx = sameLine.findIndex((x) => x.id === r.id);
  const radius = r.zone === 1 ? R_Z1 : idx === sameLine.findIndex((x) => x.zone === 2) ? R_Z2A : R_Z2B;
  return polar(r.line, radius);
}

function labelAnchor(r: Round, p: { x: number; y: number }) {
  if (r.kind === 'hub') return { x: p.x, y: p.y + 52, anchor: 'middle' as const };
  if (r.kind === 'terminus') return { x: p.x + 28, y: p.y + 5, anchor: 'start' as const };
  // Put each label beside its station, on the outward horizontal side, so neighbouring
  // labels spread apart instead of running into each other.
  const a = angle(r.line);
  let px = -Math.sin(a);
  let py = Math.cos(a);
  const dx = p.x - C;
  const side = Math.abs(dx) < 8 ? 1 : Math.sign(dx);
  if (px * side < 0) {
    px = -px;
    py = -py;
  }
  const anchor = px > 0.3 ? ('start' as const) : px < -0.3 ? ('end' as const) : ('middle' as const);
  // On a near-horizontal spoke the two Zone 2 labels would sit side by side and touch,
  // so the outer one goes on the other side of the line.
  const zone2 = ROUNDS.filter((x) => x.line === r.line && x.zone === 2 && x.kind === 'line').sort((m, n) => m.n - n.n);
  const flip = anchor === 'middle' && r.zone === 2 && zone2.findIndex((x) => x.id === r.id) === 1 ? -1 : 1;
  return { x: p.x + px * 27, y: p.y + py * 27 * flip + 5, anchor };
}

function Badge(props: { state: RoundState }) {
  if (props.state === 'ahead') return null;
  return (
    <g transform="translate(14,-14)" aria-hidden="true">
      <circle r={9} fill={props.state === 'started' ? 'var(--surface)' : props.state === 'done' ? 'var(--good)' : 'var(--ink)'} stroke="var(--bg)" strokeWidth={2} />
      {props.state === 'done' && <path d="M-4.5 0 L-1.5 3.2 L4.5 -3.4" fill="none" stroke="var(--bg)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />}
      {props.state === 'started' && <path d="M0 -6 A6 6 0 0 1 0 6 Z" fill="var(--warn)" />}
      {props.state === 'tested' && <path d="M-4.5 -3.5 L-0.5 0 L-4.5 3.5 M0.5 -3.5 L4.5 0 L0.5 3.5" fill="none" stroke="var(--bg)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
}

function Station(props: { r: Round; state: RoundState; next: boolean }) {
  const { r, state } = props;
  const ready = isReady(r.id);
  const p = stationPosition(r);
  const lab = labelAnchor(r, p);
  const color = r.kind === 'terminus' || r.kind === 'hub' || r.kind === 'junction' ? 'var(--ink)' : `var(--line-${r.line})`;
  const name = `Round ${r.n}, ${r.station}, ${r.zone === 1 ? 'Zone 1' : 'Zone 2'}, ${ready ? STATE_TEXT[state] : 'opening soon'}${props.next ? ', next round' : ''}`;
  const radius = r.kind === 'hub' ? 26 : r.kind === 'junction' ? 19 : 17;
  const body = (
    <>
      {props.next && <circle cx={p.x} cy={p.y} r={radius + 9} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeDasharray="5 4" />}
      {r.kind === 'terminus' ? (
        <rect x={p.x - 18} y={p.y - 18} width={36} height={36} rx={6} fill="var(--surface)" stroke={color} strokeWidth={5} />
      ) : (
        <circle cx={p.x} cy={p.y} r={radius} fill={r.kind === 'hub' ? 'var(--ink)' : 'var(--surface)'} stroke={color} strokeWidth={r.kind === 'hub' ? 0 : 5} strokeDasharray={ready ? undefined : '4 3'} />
      )}
      <text x={p.x} y={p.y + 5.5} textAnchor="middle" className="svg-num" fill={r.kind === 'hub' ? 'var(--bg)' : 'var(--ink)'}>{r.n}</text>
      <g transform={`translate(${p.x},${p.y})`}><Badge state={ready ? state : 'ahead'} /></g>
      <text x={lab.x} y={lab.y} textAnchor={lab.anchor} className="svg-label" fill={ready ? 'var(--ink)' : 'var(--ink-2)'}>{r.station}</text>
    </>
  );
  if (!ready) return <g className="station station--soon" role="img" aria-label={name}><title>{name}</title>{body}</g>;
  return (
    <a className="station" href={`#${r.id}`} aria-label={name}>
      <title>{name}</title>
      {body}
    </a>
  );
}

export function TransitMap(props: { progress: Progress; nextId: string | null }) {
  const hub = { x: C, y: C };
  return (
    <svg className="transit" viewBox="-110 0 1100 900" role="group" aria-label="Course map. Nine lines, Zone 1 inside the dashed ring and Zone 2 outside it.">
      <circle cx={C} cy={C} r={R_OUTER} fill="none" stroke="var(--rule)" strokeWidth={2} />
      <circle cx={C} cy={C} r={R_BOUNDARY} fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeDasharray="8 7" />
      <line x1={C} y1={C} x2={C} y2={C + 410} stroke="var(--ink-2)" strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
      {LINES.map((l) => {
        const end = polar(l.n, R_OUTER - 6);
        return <line key={l.n} x1={hub.x} y1={hub.y} x2={end.x} y2={end.y} stroke={`var(--line-${l.n})`} strokeWidth={9} strokeLinecap="round" />;
      })}
      {LINES.map((l) => {
        const p = polar(l.n, R_OUTER + 4);
        const a = angle(l.n);
        const tx = p.x + Math.cos(a) * 22;
        const ty = p.y + Math.sin(a) * 22;
        const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
        return (
          <g key={`sign-${l.n}`} aria-hidden="true">
            <circle cx={p.x} cy={p.y} r={15} fill={`var(--line-${l.n})`} />
            <text x={p.x} y={p.y + 5.5} textAnchor="middle" className="svg-num" fill={`var(--on-line-${l.n})`}>{l.n}</text>
            <text x={tx + (anchor === 'start' ? 2 : anchor === 'end' ? -2 : 0)} y={ty + (Math.sin(a) < -0.5 ? -2 : Math.sin(a) > 0.5 ? 12 : 5)} textAnchor={anchor} className="svg-line" fill="var(--ink)">{l.short.toUpperCase()}</text>
          </g>
        );
      })}
      {ROUNDS.map((r) => (
        <Station key={r.id} r={r} state={roundState(props.progress, r.id)} next={props.nextId === r.id} />
      ))}
    </svg>
  );
}
