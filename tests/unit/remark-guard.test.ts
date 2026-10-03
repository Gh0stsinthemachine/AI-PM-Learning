import { describe, it, expect } from 'vitest';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { remarkGuard } from '../../build/remark-guard.mjs';
import { MDX_COMPONENTS } from '../../src/mdx/names';

const run = (src: string) =>
  compile({ value: src, path: 'x.mdx' }, { remarkPlugins: [remarkGfm, [remarkGuard, { allowed: [...MDX_COMPONENTS] }]] });

describe('remark guard', () => {
  it('accepts allowed components with string props and backticked code', async () => {
    await expect(run('# Hi\n\n<Term id="token">token</Term> and `<example>` and `{x}`.\n\n<Callout kind="gap">\nok\n</Callout>')).resolves.toBeTruthy();
  });
  it('rejects lowercase tags', async () => {
    await expect(run('Use <example>this</example> tag.')).rejects.toThrow(/not an allowed component/);
  });
  it('rejects unknown components', async () => {
    await expect(run('<Banner kind="x" />')).rejects.toThrow(/not an allowed component/);
  });
  it('rejects expressions in prose and in attributes', async () => {
    await expect(run('Hello {1 + 1}')).rejects.toThrow(/expression/);
    await expect(run('<Term id={"x"}>y</Term>')).rejects.toThrow(/plain string/);
  });
  it('rejects import and export', async () => {
    await expect(run('import X from "x"\n\nhi')).rejects.toThrow(/import\/export/);
    await expect(run('export const a = 1\n\nhi')).rejects.toThrow(/import\/export/);
  });
});
