import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { remarkGuard } from '../../build/remark-guard.mjs';
import { MDX_COMPONENTS } from '../../src/mdx/names';
import { LINES, ROUNDS, TOTAL_ROUNDS } from '../../src/content/manifest';
import { CHECKS } from '../../src/content/checks';
import { GLOSSARY } from '../../src/content/glossary';
import { FIGURE_IDS } from '../../src/diagrams';
import { WIDGET_IDS } from '../../src/widgets/registry';

const roundsDir = join(process.cwd(), 'src/content/rounds');
const files = readdirSync(roundsDir).filter((f) => f.endsWith('.mdx')).sort();
const source = (f: string) => readFileSync(join(roundsDir, f), 'utf8');
const idOf = (f: string) => /^(r\d\d)-/.exec(f)?.[1] ?? '';
const roundNum = (f: string) => Number(idOf(f).slice(1));
const prose = (src: string) =>
  src
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<Sources>[\s\S]*?<\/Sources>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`#>-]/g, ' ');
const proseWords = (src: string) => prose(src).split(/\s+/).filter(Boolean).length;
// Code blocks (example prompts) take reading time too, so they count toward the 20 minutes.
const codeWords = (src: string) => [...src.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]!.split(/\s+/).filter(Boolean).length).reduce((a, b) => a + b, 0);
const words = (src: string) => proseWords(src) + codeWords(src);

describe('manifest', () => {
  it('has 29 rounds with stable, sequential ids', () => {
    expect(ROUNDS).toHaveLength(TOTAL_ROUNDS);
    expect(TOTAL_ROUNDS).toBe(29);
    ROUNDS.forEach((r, i) => {
      expect(r.n).toBe(i + 1);
      expect(r.id).toBe('r' + String(i + 1).padStart(2, '0'));
      expect(r.id).toMatch(/^[A-Za-z0-9._~-]+$/); // valid as a bare hash route
    });
  });
  it('puts Zone 1 on rounds 1-10 and Zone 2 on 11-29', () => {
    for (const r of ROUNDS) expect(r.zone).toBe(r.n <= 10 ? 1 : 2);
  });
  it('gives every line a Zone 1 stop and two Zone 2 stops, plus the three hub stations', () => {
    for (const l of LINES) {
      const on = ROUNDS.filter((r) => r.line === l.n && r.kind === 'line');
      if (l.n === 1) expect(on.map((r) => r.zone)).toEqual([2, 2]);
      else expect(on.map((r) => r.zone)).toEqual([1, 2, 2]);
    }
    expect(ROUNDS.filter((r) => r.kind === 'hub')).toHaveLength(1);
    expect(ROUNDS.filter((r) => r.kind === 'junction')).toHaveLength(1);
    expect(ROUNDS.filter((r) => r.kind === 'terminus')).toHaveLength(1);
    expect(ROUNDS.find((r) => r.kind === 'terminus')!.n).toBe(29);
  });
  it('has unique titles, stations and widget ids; short station names', () => {
    for (const key of ['title', 'station', 'widget'] as const) expect(new Set(ROUNDS.map((r) => r[key])).size).toBe(29);
    for (const r of ROUNDS) expect(r.station.length).toBeLessThanOrEqual(18);
  });
  it('every round is about 20 minutes', () => {
    for (const r of ROUNDS) expect(r.minutes).toBe(20);
  });
});

describe('round files', () => {
  it('each file is named rNN-slug.mdx and matches a round', () => {
    for (const f of files) {
      expect(f).toMatch(/^r\d\d-[a-z0-9-]+\.mdx$/);
      expect(ROUNDS.find((r) => r.id === idOf(f))).toBeTruthy();
    }
    expect(new Set(files.map(idOf)).size).toBe(files.length);
  });
  for (const f of files) {
    describe(f, () => {
      const src = source(f);
      it('compiles through the guard', async () => {
        await expect(compile({ value: src, path: f }, { remarkPlugins: [remarkGfm, [remarkGuard, { allowed: [...MDX_COMPONENTS] }]] })).resolves.toBeTruthy();
      });
      it('uses only known terms, figures and widgets', () => {
        for (const m of src.matchAll(/<Term id="([^"]+)"/g)) expect(GLOSSARY.map((g) => g.id), `term ${m[1]}`).toContain(m[1]);
        for (const m of src.matchAll(/<Figure id="([^"]+)"/g)) expect(FIGURE_IDS, `figure ${m[1]}`).toContain(m[1]);
        for (const m of src.matchAll(/<Widget id="([^"]+)"/g)) expect(WIDGET_IDS, `widget ${m[1]}`).toContain(m[1]);
        for (const m of src.matchAll(/<Callout kind="([^"]+)"/g)) expect(['gap', 'change', 'notice', 'service']).toContain(m[1]);
      });
      it('does not repeat the callout label in its text', () => {
        expect(src).not.toMatch(/<Callout kind="gap">\s*Mind the gap/i);
        expect(src).not.toMatch(/<Callout kind="change">\s*Change here/i);
      });
      it('has no placeholders, lorem or empty promises', () => {
        expect(src).not.toMatch(/\bTK\b|TODO|FIXME|lorem ipsum|\[TK\]/i);
      });
      it('keeps stock phrases out', () => {
        expect(src).not.toMatch(/\b(delve|game-changer|in today's fast-paced|worth noting|unlock the power)\b/i);
      });
      it('links only to https', () => {
        for (const m of src.matchAll(/\]\(([^)]+)\)/g)) expect(m[1]).toMatch(/^https:\/\//);
        expect(src).not.toMatch(/\]\((?!https:\/\/)[^)]*\)/);
      });
      it('says when its sources were checked', () => {
        if (/<Sources>/.test(src)) expect(src).toMatch(/Checked [A-Z][a-z]{2} 20\d\d/);
        if (/<LastChecked/.test(src)) expect(src).toMatch(/<LastChecked date="[A-Z][a-z]{2} 20\d\d"/);
      });
      it('fits a 20-minute round (reading at 125 words a minute, plus the fixed steps)', () => {
        const minutes = 12 + words(src) / 125; // warm-up 2 (or self-check 2) + try 6 + check 3 + wrap 1
        expect(minutes, `${words(src)} words`).toBeGreaterThanOrEqual(18);
        expect(minutes, `${words(src)} words`).toBeLessThanOrEqual(22);
      });
      it('keeps sentences short (average under 22 words)', () => {
        const sentences = prose(src).split(/[.!?]+\s/).filter((s) => s.trim().split(/\s+/).length > 2);
        const avg = sentences.reduce((a, s) => a + s.trim().split(/\s+/).length, 0) / sentences.length;
        expect(avg).toBeLessThan(22);
      });
      it('teaches every glossary term assigned to its round', () => {
        const n = roundNum(f);
        for (const g of GLOSSARY.filter((x) => x.round === n)) expect(src, `term ${g.id}`).toContain(`<Term id="${g.id}"`);
      });
    });
  }
});

describe('checks', () => {
  it('every round with content has a check of four questions', () => {
    for (const f of files) {
      const c = CHECKS.find((x) => x.round === roundNum(f));
      expect(c, f).toBeTruthy();
      expect(c!.questions).toHaveLength(4);
      expect(c!.takeawayPrompt.length).toBeGreaterThan(10);
    }
  });
  it('questions are well formed', () => {
    const ids = new Set<string>();
    for (const c of CHECKS) {
      for (const [i, q] of c.questions.entries()) {
        expect(q.id).toBe(`r${String(c.round).padStart(2, '0')}-q${i + 1}`);
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
        expect(q.choices.length).toBeGreaterThanOrEqual(3);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        expect(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length).toBe(true);
        expect(q.explanation.length).toBeGreaterThan(20);
        expect(q.prompt.endsWith('?') || q.prompt.endsWith('.')).toBe(true);
      }
    }
  });
  it('the correct answer is not always in the same position', () => {
    const positions = CHECKS.flatMap((c) => c.questions.map((q) => q.answer));
    expect(new Set(positions).size).toBeGreaterThan(1);
  });
});

describe('glossary', () => {
  it('has unique ids and terms', () => {
    expect(new Set(GLOSSARY.map((g) => g.id)).size).toBe(GLOSSARY.length);
    expect(new Set(GLOSSARY.map((g) => g.term.toLowerCase())).size).toBe(GLOSSARY.length);
  });
  it('every definition is one plain sentence of 40 words or fewer', () => {
    for (const g of GLOSSARY) {
      const n = g.definition.trim().split(/\s+/).length;
      expect(n, g.id).toBeLessThanOrEqual(40);
      expect(g.definition, g.id).toMatch(/[.]$/);
      expect(g.definition.split(/[.!?]\s+[A-Z]/).length, `${g.id} has more than one sentence`).toBe(1);
      expect(g.round).toBeGreaterThanOrEqual(1);
      expect(g.round).toBeLessThanOrEqual(29);
    }
  });
});
