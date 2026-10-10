# Horizon UI update

Implementation and local review: 8–9 October 2026. Branch: `codex/horizon-ui-update`, based on `bc15856`.

## Delivered

- Complete photographic landing: bold Manrope headline, supplied logo, fictional planner preview, prerequisite and offering examples, getting-started sequence, privacy closing and photographer credit. On 10 October, restored the preferred angled desktop preview and floating course/finish cards; phones retain an upright compact preview.
- Locally served real Unsplash photograph with desktop resolutions and a separate sharp phone crop. The 5.7 MB original is excluded from shipped assets. No generated background imagery or personal curriculum is included.
- Compact workspace header and explicit device-saving disclosure. Finish, confidence and next courses precede customization. Course-date context stays in the shared term heading and is included in each course button's accessible text.
- Scenario comparison leads with finish, workload, starting term, waiting terms, unresolved count and changed schedule outcomes. Existing full schedule comparisons and restoration remain available.
- Graph cards show full titles, annual offerings and distinct planned dates. The list and accessible node labels include dates too. View options are secondary; Full chain and the blue/orange relationship model remain. Course-status changes preserve graph zoom/pan, and ordinary page scrolling works over the graph.
- Existing bounded parallax and reveal behavior follows the device motion preference. No motion library or preference override was added.
- Student kit now starts with landing comprehension and recognition of fictional examples.
- Schedule setup groups the starting date and workload, places presets beneath the unit limit, and uses clearer text and consistent spacing. Course search appears in the planning workspace; setup retains its own progress search.

## Verification evidence

All browser checks used fictional data in the Codex in-app browser. Screenshots are kept locally under `output/horizon-update/` (ignored by Git).

| Check | Result |
| --- | --- |
| Existing baseline | 41 tests and production build passed before implementation. |
| Updated suite | 42 tests passed; new waiting-term regression covers offering gaps, current load, unresolved and completed curricula. |
| TypeScript / ESLint / build | Passed again after restoring the layered preview on 10 October. Production first-load JavaScript is 144 kB. This is not a Core Web Vitals measurement. |
| Production preview assets | Graph positioning styles present on the initial page before opening the lazy graph. |
| Import and setup | Fictional JSON imported through file chooser; Year 2 Term 1, 12 units produces Year 3 Term 2. |
| Route hierarchy | Complete first course row bottom: 717.7 px at 1280×720; 842.0 px at 390×844, with default disclosures closed. |
| Narrow layout | No page-level horizontal overflow observed at 320 px on route; mobile Dependencies starts in Course list. |
| Move and Undo | MAT102 moved to Year 5 Term 1; off-term warning and nine-term forecast delay shown; destination visible on board; Undo restored previous placement. |
| Workload comparison | 3-unit route compared against saved 12-unit route; changed SCI201L date and waiting terms shown. Save disabled while settings were uncommitted. |
| Device saving | Opt-in checkbox required; saved feedback visible; test device copy forgotten afterwards. |
| Portable plan | Actual file downloaded, reopened, and baseline scenario/settings retained. |
| Graph viewport | Zoom transform remained exactly `translate(-75.7px, 13.16px) scale(1.02)` across a course-status edit. |
| Review | Separate standards and spec passes; corrected small-label contrast, setup announcement, date alternatives and waiting-term comparison. |
| Privacy exclusions | Existing ignore rules cover personal curricula, saved plans, environment files, service config and generated evidence. |
| Schedule setup | Starting year/term, 12-unit preset, a custom 15.5-unit limit, current-course assumptions and edited offering terms reached the forecast correctly. The 390 px layout stacked the groups without horizontal overflow. |

## Remaining release validation

- Student sessions depend on the participants the owner will arrange; no participant findings are claimed.
- A full screen-reader session and actual 200%/400% browser-zoom checks remain manual. Narrow viewport checks are not substitutes for browser zoom.
- Reduced-motion CSS and preference-listener cleanup were reviewed. This browser reported reduced motion off during this pass; live device preference changes were not exercised.
- Slow-network/empty-cache measurements and real-user Core Web Vitals remain unmeasured.
- Baseline screenshots cover landing and setup; post-change captures also cover route and graph. Earlier board/graph baseline captures were interrupted and were not fabricated.

Publication checks: 42 tests, lint and the production build passed on 10 October 2026. Local drafts and research files are excluded from publication.
