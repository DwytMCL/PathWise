# Landing redesign — Horizon, cinematic

Implementation and local review: 19 October 2026. Branch: `landing-redesign`, based on `d82c501`.

## Direction

Three dealt directions (design-taste-frontend draw, paired with Linear, Oura and Apple systems from the DESIGN.md library) were mocked and rejected as harsh and bare. The owner chose an Apple-style cinematic page that keeps Horizon's qualities: the blue-horizon photograph, the soft blue and ink palette, Manrope and the polished planner still. Copy was rewritten around one claim per section.

## Delivered

- `components/landing/` replaces `components/Landing.tsx` with the same `{ onOpen, busy }` contract: hero, statement, prerequisite chain, offering window, pace, steps, privacy and footer, each with a heading.
- Fictional example data lives in `components/landing/example.ts`; every figure agrees (66 units left from Year 3 · Term 1, finish Year 4 · Term 1 at 18 units).
- Interface fragments are built in HTML and marked `data-ui`: the planner still, the chain graph (a stacked timeline on phones), the term window and a working unit-limit control whose finish and term bars respond.
- Motion (`useLandingMotion.ts`): GSAP ScrollTrigger and Lenis, loaded with dynamic `import()` only on the landing. Desktop holds three scenes — the tilted planner straightens and rises (a sticky stage, so the CSS intro is never restarted by re-parenting), the chain draws term by term, a once-a-year course is flagged in Term 2 and moves into its window. Statement words fill on scroll; sections rise in once. Phones keep the scrubbed scenes without pins or smooth scrolling. Reduced motion pins nothing and hides nothing.
- Everything is reverted on unmount, and the workspace opens at the top when a file is chosen from deep in the page.
- Privacy section reuses the credited photograph under a neutral scrim; no other gradients outside the hero scrim.

## Verification evidence

All checks used fictional data. Screenshots are kept locally under `output/landing-redesign/` (ignored by Git).

| Check | Result |
| --- | --- |
| Tests / ESLint / TypeScript / build | 42 tests passed; lint and type-check clean; `/` first-load JS 147 kB (was 144 kB). GSAP and Lenis load in a separate lazy chunk. |
| `pnpm check:preview` | Graph positioning styles present before the graph opens. |
| taste-skill lint | 0 FAIL, 0 WARN on `components/landing`. |
| taste-skill inspect (1440 / 768 / 390, production build) | 0 FAIL. Remaining WARNs are deliberate: floating pill navigation and Manrope kept from Horizon, no honest video clip, the hero title fades over its own photograph while pinned, 11 type sizes. |
| web-design-guidelines | Baseline findings resolved (skip link, outline, small text, tabular figures, scroll margins); see `output/landing-redesign/after-audit.md`. |
| Import flow (playwright-cli) | JSON and saved HTML fixtures open the setup review; Lenis classes and all pin spacers removed; workspace scrolls normally from the top; no console errors. |
| Reduced motion | 0 pin spacers, no Lenis, 0 elements below full opacity. |
| Narrow layout | No horizontal overflow at 320 px. |

## Tooling notes

- `playwright-cli open --browser=chromium` uses Playwright's bundled Chromium (Google Chrome is not installed on the development Mac).
- The taste inspector needs Chromium with `--disable-gpu` on this machine; point `CHROME_PATH` at a wrapper script that adds it.
