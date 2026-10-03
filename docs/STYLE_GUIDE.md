# Style guide for rounds

Every round is one MDX file in `src/content/rounds/`, named `rNN-slug.mdx`. Read Rounds 1 to 3 first. They set the voice.

## The reader
A smart business person who is not an engineer. Strong on strategy and people, new to AI. They want to understand enough to make good product decisions and to talk to engineers without bluffing.

## What "101" and "102" mean
- **101 (Zone 1, rounds 1 to 10):** the idea in plain English, why a product manager cares, and one simple thing to try. Light on detail.
- **102 (Zone 2, rounds 11 to 29):** how it works, how to choose between options and why, one hands-on lab, and what goes wrong. Still no math derivations and no production engineering.

## The 20-minute round
Warm-up 2 min, learn 8 min, try 6 min, check 3 min, wrap 1 min. Round 1 swaps the warm-up for the "where are you now?" self-check.
- Learn text is **800 to 1,250 words** (code blocks count). The content test enforces 18 to 22 minutes at 125 words a minute.
- Average sentence under 22 words. Paragraphs of 4 sentences or fewer.

## Structure of a learn text
1. Short sections with `##` headings. A heading says what the section is about, plainly.
2. One `<Figure id="..." />` that earns its place.
3. A `<Callout kind="gap">` for common failures. The sign "Mind the gap" is drawn for you, so do not repeat it in the text.
4. A `<Callout kind="change">` pointing to a related round. The sign "Change here" is drawn for you.
5. A closing section "Questions to ask your team" with three or four real questions.
6. `<Sources>` (with "Checked Mon YYYY") for anything that came from outside, and `<LastChecked date="Oct 2026" />` after any fact that can go stale.

## Words
- Plain English. Define every technical term **in the same sentence** where it first appears, and wrap that first use in `<Term id="..." />` so readers can tap it. Add the term to `src/content/glossary.ts` (one sentence, 40 words or fewer).
- Write like a person: plain, specific, short. No stock phrases ("delve", "game-changer", "worth noting"), no asides set off by dashes, no "not X but Y" setups.
- Use music, business and everyday analogies sparingly and only when they teach.
- Never use "we" for the course's author. Speak to "you".

## Facts
- Never invent statistics, quotes, URLs, case studies or company anecdotes.
- Every number is computed on the page, cited, or labelled as an example ("made-up prices").
- Anything about tools, models, prices or rules that can change: verify at a primary source, then cite it and date it. If it cannot be verified, make it generic or cut it.
- Vendor tone is neutral. Describe categories and how to choose. Name tools as dated examples.
- Where the source roadmap is out of date (for example Codeium is now Windsurf, AutoGen is in maintenance mode, Llama is open-weights rather than open source), say so.

## MDX rules (enforced at build time)
- Only these components: `Term`, `Widget`, `Figure`, `Callout`, `LastChecked`, `Sources`. Props are plain strings.
- No `import`, no `export`, no `{expressions}`. Put XML tags and `{placeholders}` inside backticks or code fences.
- Links are `https://` only.

## The check
Four multiple-choice questions in `src/content/checks.ts`, ids `rNN-q1` to `rNN-q4`. Each makes sense on its own, because it can come back as a warm-up in a later round. Each has an explanation of why the right answer is right. Vary where the right answer sits. Add a takeaway prompt.

## The interactive piece
One per round, named in `src/content/manifest.ts` (`widget`). It teaches by letting the reader change something and see the result. Any live Claude feature must also work without Claude, with a worked example that is clearly labelled as hand-written.
