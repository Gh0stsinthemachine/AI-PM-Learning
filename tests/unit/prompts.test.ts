import { describe, it, expect } from 'vitest';
import { askRoundPrompt, promptRunPrompt, MAX_PROMPT_CHARS } from '../../src/prompts';
import { roundById } from '../../src/content/manifest';
import { assemblePrompt, PARTS, REVIEWS } from '../../src/widgets/PromptBuilder';

describe('prompts', () => {
  const r1 = roundById('r01')!;
  it('every prompt starts with a Task line the stub can recognise', () => {
    expect(askRoundPrompt(r1, 'hi').startsWith('Task: ask-round (AI PM 102)')).toBe(true);
    expect(promptRunPrompt('x').startsWith('Task: prompt-run (AI PM 102)')).toBe(true);
  });
  it('the ask prompt carries the round, level, the course definitions and the question', () => {
    const p = askRoundPrompt(r1, 'What is a token?');
    expect(p).toContain('Round 1: "The big picture"');
    expect(p).toContain('101');
    expect(p).toContain('- Token: A small chunk of text');
    expect(p).toContain('Question: What is a token?');
    expect(p).toMatch(/plain English/);
  });
  it('Zone 2 rounds ask for depth', () => {
    expect(askRoundPrompt(roundById('r15')!, 'x')).toContain('102');
  });
  it('stays well under the 256 KiB limit even at maximum input', () => {
    const big = 'x'.repeat(10_000_000);
    expect(askRoundPrompt(r1, big).length).toBeLessThan(6000);
    expect(promptRunPrompt(big).length).toBeLessThanOrEqual(MAX_PROMPT_CHARS + 100);
    expect(MAX_PROMPT_CHARS).toBeLessThan(256 * 1024);
  });
});

describe('prompt builder assembly', () => {
  const all = Object.fromEntries(PARTS.map((p) => [p.id, true]));
  it('with only the task on, it is the reviews followed by the task', () => {
    const p = assemblePrompt(PARTS, { task: true });
    expect(p.startsWith('Reviews:')).toBe(true);
    expect(p).toContain(PARTS.find((x) => x.id === 'task')!.text);
    expect(p).not.toContain('customer-insights analyst');
    for (const r of REVIEWS) expect(p).toContain(r);
  });
  it('with everything on, the order is role, context, reviews, examples, task, format, constraints', () => {
    const p = assemblePrompt(PARTS, all);
    const at = (s: string) => p.indexOf(s);
    const order = [at('customer-insights analyst'), at('We sell used guitars'), at('Reviews:'), at('Example of the style'), at('Summarize the reviews'), at('Return two bulleted lists'), at('Use only what is in the reviews')];
    expect(order.every((x) => x >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('reviews always come before the instructions', () => {
    const p = assemblePrompt(PARTS, all);
    expect(p.indexOf('Reviews:')).toBeLessThan(p.indexOf('Summarize the reviews'));
  });
  it('the worked-example claims match the example reviews', () => {
    const count = (re: RegExp) => REVIEWS.filter((r) => re.test(r)).length;
    expect(count(/crushed|cracked|thin/i)).toBe(3); // damaged or thin packaging
    expect(count(/shipping took|forever to ship/i)).toBe(2); // slow shipping
    expect(count(/plays beautifully|sounds great|sounds amazing/i)).toBe(3); // plays and sounds great
    expect(count(/out of the box/i)).toBe(2); // ready to play out of the box
    expect(count(/great value|for the price/i)).toBe(2); // good value
    expect(count(/sharp/i)).toBe(1); // mentioned once, left out
  });
});
