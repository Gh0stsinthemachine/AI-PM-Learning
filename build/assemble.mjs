// Turns the Vite bundle (dist/.bundle/app.js + app.css) into two files:
//   dist/artifact/index.html  the HTML FRAGMENT published as the claude.ai Artifact
//                             (no doctype/html/head/body: the platform wraps it)
//   dist/web/index.html       a full document for local tests and a later Vercel deploy
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { TITLE, REACT_URL, REACT_DOM_URL, FONTS_HREF, ALLOWED_EXTERNAL } from './cdn.mjs';

const WARN_BYTES = 2 * 1024 * 1024;
const FAIL_BYTES = 6 * 1024 * 1024;

export function escapeInlineScript(js) {
  return js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}
export function escapeInlineStyle(css) {
  return css.replace(/<\/style/gi, '<\\/style');
}

// Replica of the platform's page reset, so local runs match the artifact.
const PLATFORM_RESET =
  ':root{color-scheme:light;padding-block:env(safe-area-inset-top,0px) env(safe-area-inset-bottom,0px)}' +
  'body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}';

const BOOT_BOARD =
  '<div id="root"><div class="boot" role="status"><span class="boot__bullet" aria-hidden="true"></span>' +
  '<span class="boot__name">AI PM 102</span><span class="boot__sub">Loading the map</span></div></div>';

const GUARD =
  '<script>if(!window.React||!window.ReactDOM){var r=document.getElementById("root");' +
  'if(r)r.textContent="Could not load the page\'s interface library. Reload to try again."}</script>';

function parts({ js, css }) {
  const head = [
    `<title>${TITLE}</title>`,
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link rel="stylesheet" href="${FONTS_HREF}">`,
    `<style>${escapeInlineStyle(css)}</style>`,
  ];
  const body = [
    BOOT_BOARD,
    `<script src="${REACT_URL}"></script>`,
    `<script src="${REACT_DOM_URL}"></script>`,
    GUARD,
    `<script>${escapeInlineScript(js)}</script>`,
  ];
  return { head, body };
}

export function buildFragment(input) {
  const { head, body } = parts(input);
  return [...head, ...body, ''].join('\n');
}

export function buildWebDocument(input) {
  const csp =
    "default-src 'none'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
    "img-src 'self' data: blob:; connect-src 'self'; base-uri 'none'; form-action 'none'";
  const { head, body } = parts(input);
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    `<style>${PLATFORM_RESET}</style>`,
    ...head,
    '</head>',
    '<body>',
    ...body,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

export function checkFragment(html, js) {
  const problems = [];
  const titleAt = html.indexOf('<title>');
  if (titleAt < 0 || titleAt > 8000) problems.push('title missing or past the first 8 KB');
  if (/<!doctype|<html|<head|<body/i.test(html.replace(/<script>[\s\S]*?<\/script>/g, '').replace(/<style>[\s\S]*?<\/style>/g, '')))
    problems.push('fragment contains document-level tags');
  const urls = new Set([...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]));
  for (const u of urls) if (!ALLOWED_EXTERNAL.has(u)) problems.push(`unexpected external URL: ${u}`);
  if (js.includes('AIPM_STUB')) problems.push('test stub sentinel found in the bundle');
  if (/jsx-(dev-)?runtime/.test(js)) problems.push('a jsx-runtime import leaked into the bundle (classic runtime required)');
  const size = Buffer.byteLength(html);
  if (size > FAIL_BYTES) problems.push(`fragment is ${(size / 1e6).toFixed(1)} MB, over the 6 MB limit`);
  try {
    new vm.Script(escapeInlineScript(js));
  } catch (e) {
    problems.push(`bundle does not parse after escaping: ${e.message}`);
  }
  return { problems, size, warn: size > WARN_BYTES };
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const bundle = join(root, 'dist', '.bundle');
  if (!existsSync(join(bundle, 'app.js'))) throw new Error('dist/.bundle/app.js not found. Run vite build first.');
  const js = readFileSync(join(bundle, 'app.js'), 'utf8');
  const cssFile = readdirSync(bundle).find((f) => f.endsWith('.css'));
  const css = cssFile ? readFileSync(join(bundle, cssFile), 'utf8') : '';

  const fragment = buildFragment({ js, css });
  const { problems, size, warn } = checkFragment(fragment, js);
  if (problems.length) {
    console.error('assemble: build checks failed:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
  mkdirSync(join(root, 'dist', 'artifact'), { recursive: true });
  mkdirSync(join(root, 'dist', 'web'), { recursive: true });
  writeFileSync(join(root, 'dist', 'artifact', 'index.html'), fragment);
  writeFileSync(join(root, 'dist', 'web', 'index.html'), buildWebDocument({ js, css }));
  console.log(`assemble: artifact fragment ${(size / 1024).toFixed(0)} KB${warn ? ' (over the 2 MB warning line)' : ''}; web document written.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
