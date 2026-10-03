import { describe, it, expect } from 'vitest';
import { buildFragment, buildWebDocument, checkFragment, escapeInlineScript, escapeInlineStyle } from '../../build/assemble.mjs';

const css = ':root{--a:1}';
const js = '(function(){var s="</script><!-- x";return s})()';

describe('assemble', () => {
  it('escapes script and style terminators', () => {
    expect(escapeInlineScript('"</script>"')).toBe('"<\\/script>"');
    expect(escapeInlineScript('<!--')).toBe('<\\!--');
    expect(escapeInlineStyle('a</style>b')).toBe('a<\\/style>b');
  });

  it('builds a fragment with the title first and no document tags', () => {
    const html = buildFragment({ js, css });
    expect(html.startsWith('<title>AI PM 102</title>')).toBe(true);
    const { problems } = checkFragment(html, js);
    expect(problems).toEqual([]);
    expect(html).not.toContain('</script><!--');
    expect(html.match(/<script/g)).toHaveLength(4);
  });

  it('puts the scripts after #root and the guard before the app script', () => {
    const html = buildFragment({ js, css });
    const root = html.indexOf('id="root"');
    const react = html.indexOf('react.production.min.js');
    const guard = html.indexOf('window.React||!window.ReactDOM');
    const app = html.indexOf('(function(){var s=');
    expect(root).toBeGreaterThan(0);
    expect(react).toBeGreaterThan(root);
    expect(guard).toBeGreaterThan(react);
    expect(app).toBeGreaterThan(guard);
  });

  it('flags document tags, foreign URLs, stub sentinel and jsx-runtime', () => {
    const bad = buildFragment({ js, css }) + '<body><script src="https://evil.example/x.js"></script>';
    const r = checkFragment(bad, 'AIPM_STUB jsx-runtime');
    expect(r.problems.join('\n')).toMatch(/document-level tags/);
    expect(r.problems.join('\n')).toMatch(/unexpected external URL/);
    expect(r.problems.join('\n')).toMatch(/stub sentinel/);
    expect(r.problems.join('\n')).toMatch(/jsx-runtime/);
  });

  it('flags a bundle that does not parse', () => {
    expect(checkFragment(buildFragment({ js: 'var =', css }), 'var =').problems.join()).toMatch(/does not parse/);
  });

  it('the web document is a full document with a CSP and a body', () => {
    const doc = buildWebDocument({ js, css });
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('Content-Security-Policy');
    expect(doc).toContain('<body>');
    expect(doc.indexOf('<title>')).toBeLessThan(doc.indexOf('<body>'));
  });
});
