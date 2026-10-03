import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Reads the design tokens and checks contrast in light, dark and the explicit dark override.
const css = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');

function block(start: string): string {
  const i = css.indexOf(start);
  if (i < 0) throw new Error('missing block ' + start);
  const open = css.indexOf('{', i);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === '{') depth++;
    if (css[j] === '}' && --depth === 0) return css.slice(open + 1, j);
  }
  throw new Error('unclosed block');
}
const vars = (b: string) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));

const light = vars(block(':root {'));
const darkMedia = vars(block(":root:not([data-theme='light'])"));
const darkExplicit = vars(block(":root[data-theme='dark']"));

const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe('design tokens', () => {
  it('the explicit dark theme and the OS dark theme define the same colours', () => {
    const keys = Object.keys(darkExplicit).filter((k) => darkExplicit[k]!.startsWith('#'));
    for (const k of keys) expect(darkMedia[k], k).toBe(darkExplicit[k]);
  });
  it('every colour token is defined on bare :root and redefined for dark', () => {
    for (const k of Object.keys(darkExplicit).filter((k) => darkExplicit[k]!.startsWith('#'))) expect(light[k], `light ${k}`).toBeTruthy();
  });
  for (const [name, t] of [['light', light], ['dark', { ...light, ...darkExplicit }]] as const) {
    describe(name, () => {
      it('text is readable on the page and on surfaces', () => {
        expect(ratio(t.ink!, t.bg!)).toBeGreaterThanOrEqual(7);
        expect(ratio(t['ink-2']!, t.bg!)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(t['ink-2']!, t['surface-2']!)).toBeGreaterThanOrEqual(4.5);
        expect(ratio(t.ink!, t.surface!)).toBeGreaterThanOrEqual(7);
        for (const k of ['good', 'warn', 'bad']) expect(ratio(t[k]!, t.bg!), k).toBeGreaterThanOrEqual(4.5);
      });
      it('the nine line colours stand out from the page and surfaces (3:1)', () => {
        for (let n = 1; n <= 9; n++) {
          expect(ratio(t[`line-${n}`]!, t.bg!), `line-${n} on bg`).toBeGreaterThanOrEqual(3);
          expect(ratio(t[`line-${n}`]!, t.surface!), `line-${n} on surface`).toBeGreaterThanOrEqual(3);
        }
      });
      it('the number printed on each line colour is readable (4.5:1)', () => {
        for (let n = 1; n <= 9; n++) expect(ratio(t[`on-line-${n}`]!, t[`line-${n}`]!), `on-line-${n}`).toBeGreaterThanOrEqual(3.5);
      });
      it('focus ring and page ground contrast', () => {
        expect(ratio(t.focus!, t.bg!)).toBeGreaterThanOrEqual(7);
      });
    });
  }
});
