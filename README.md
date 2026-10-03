# AI PM 102

A 29-round interactive course (about 20 minutes per round) that starts at 101 and goes deeper, covering every topic on Aakash Gupta's AI PM Learning Roadmap. All content is original. It is built as a private claude.ai Artifact (a hosted page only its owner opens), and the same build also runs as a plain static site.

Status: M1 in progress. Rounds 1 to 3, the map, the round player and progress sync are built. Rounds 4 to 29 are next.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install. `.npmrc` sets `legacy-peer-deps` because npm 10 crashes on vitest's optional peers. |
| `npm run dev` | Dev server. Add `?stub` to the URL to install the fake `window.claude`. |
| `npm run build` | Vite bundle, then `build/assemble.mjs` writes `dist/artifact/index.html` (the Artifact fragment) and `dist/web/index.html` (full document). |
| `npm run typecheck` | `tsc --noEmit`, strict. |
| `npm test` | Vitest: unit tests and content-integrity tests. |
| `npm run test:e2e` | Playwright against `dist/web`. Needs a build first. |
| `npm run check` | All of the above, in order. |
| `npm run links` | Link check. Needs normal network access. |

## How the build works

- React 18.3.1 is not bundled. The page loads it from cdnjs (UMD globals). 18.3.1 is the last React that ships a UMD build, so it is pinned.
- Lessons are MDX with the classic JSX runtime. MDX prints a deprecation warning about the `jsxRuntime`/`pragma` options during the build. The output is still plain `React.createElement`, and `assemble.mjs` fails the build if a `jsx-runtime` import ever appears.
- `build/remark-guard.mjs` fails the build on lowercase JSX tags, unknown components, `{...}` expressions and import/export inside rounds. Allowed components are listed in `src/mdx/names.ts`.
- The Artifact fragment has no doctype/html/head/body (the platform adds those). Everything is inlined except React (cdnjs) and the fonts (Google Fonts), the only hosts the Artifact CSP allows.
- Styles are plain CSS with tokens, not `@layer`: the platform's reset is unlayered and would beat layered rules.
- In this sandbox cdnjs is blocked, so the browser tests serve React's UMD files from `node_modules` and stub the fonts.

## Tests

- `tests/unit`: pure functions and the build pipeline.
- `tests/content`: content-integrity checks (added with the course content).
- `tests/e2e`: Playwright. Modes: `live` (stub with Claude available), `fallback` (no `window.claude`, like Vercel), `denied`, `no-tools`, `signed-out`, `rate-limited`, `slow`.
- `tests/stub/claude-stub.js` is the fake `window.claude`. It is only loaded by Playwright or the dev server and never ships. The build fails if its sentinel is found in the bundle.

## Writing rounds

See `docs/STYLE_GUIDE.md`. Content lives in `src/content/` (`manifest.ts`, `glossary.ts`, `checks.ts`, `rounds/*.mdx`). `npm test` checks every round for length, links, terms and quiz quality.

## Platform contract

`src/types/claude/*.d.ts` are copied from the Artifact runtime contract 0.2.67. Capabilities declared at publish: `sample`, `db`, `user`, `downloads`. See `PUBLISHING.md`.
