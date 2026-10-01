# PathWise UI/UX overhaul

Branch: `codex/ui-ux-redesign`. Based on the approved UI/UX research report and the user's request for a complete, usable redesign.

## Intended experience

- A soft blue and ink visual system, with readable typography, restrained decoration, and the user's PathWise logo.
- A landing page that explains the outcome with a clearly labeled fictional course route. No personal curriculum is bundled.
- Immediate suggested routes after importing a curriculum or saved plan.
- Visible next courses, inferred offering terms, prerequisite requirements, finish estimates, and estimate confidence.
- A fixed comparison snapshot to compare workload or starting-term changes. Stale settings prevent applying an outdated result.
- A compact, expandable full timeline including waiting terms.
- A term board grouped by year, wrapping columns, full course titles, searchable course details, and moves available without dragging.
- A focused dependency graph, a course selector and search, explicit OR/corequisite relationships, and a readable course-list alternative. Small screens start with the list.
- Native course dialogs, keyboard access, visible focus, larger controls, status announcements, and responsive layouts.
- Save, export, Undo, confirmation before replacing changed work or closing, and browser protection against losing unsaved changes on refresh.
- Manual placements can be released for recalculation and restored with Undo. Applying a suggested plan does not create manual pins.

## Scope boundaries

The existing prerequisite analysis and scheduling engine remain the source of plan validity. Offering terms are assumptions inferred from the file, never labeled official. A fastest route found is distinguished from a finish matching the modeled lower bound. Incomplete routes never claim a whole-degree finish. No account, server upload, new runtime dependency, release version, or production deployment is part of this change.

## Verification

Run the existing parser, planner, saved-plan and preview tests, including the added placement-release regression. Run TypeScript, ESLint, and the production build. Check actual browser flows using fictional fixtures: import, next courses, workload comparison, incomplete plans, apply and Undo, search and status changes, off-term moves, placement release, save and reopen, graph/list navigation, closing/replacement, and desktop/mobile layout.

Visual and interaction checks establish that the implementation works in these tested cases. Improvement percentages, student-study outcomes, and full accessibility conformance are not claimed.

### Results — 1 October 2026

- Inspo MCP references from Linear and Flatfile informed navigation, restrained surfaces, and the course-row hierarchy. The report remains the design rationale.
- All 24 automated tests pass, including manual-placement release/Undo and indirect corequisite chains with cycles. TypeScript, ESLint, and the production build pass. The preview check confirms graph positioning styles load before the graph opens.
- Browser checks with fictional data verified immediate planning, an 18-to-3-unit comparison, recalculation after applying dates, search, status edits, Escape and focus return, off-term confirmation, release/Undo, finding the correct board year, saved-plan import, and cancelling replacement/closing.
- Unresolved, current-load-only, and all-completed curricula display distinct guidance. Full-chain exploration includes prerequisites of corequisites, and the text view preserves OR groups and corequisite expressions.
- Layout checked at 1440, 375, and 320 pixels. Phone views have no page overflow, use a stacked board, collapse planning settings after import, and default to the dependency list.
- The Save action displayed its success message, but the embedded browser did not report a completed download. Actual download persistence remains unverified here; saved-file serialization/reopening passes automated tests and a saved fixture reopens correctly in the UI.
- Local screenshots are under `output/ui-ux/` (ignored). Personal curriculum data was not used or bundled.

### Course-move visibility fix

Manual placements now expand their timeline terms. Closing course details after a move reveals and focuses the destination course. The board follows moves and Undo across year filters while preserving All Years. Courses excluded from the suggestion, such as completed/current-load courses, are shown at their actual placement on the board. A rendered-route regression catches collapsed manual destinations; browser checks cover direct moves, off-term confirmation, cancellation, movement across years, Undo, and completed-course placement. All 25 tests pass. The test configuration enables the same automatic JSX runtime used by the app for component-rendering checks.

### Graph clarity revision

Following feedback that the earlier graph was easier to understand, Full chain is the default again. Blue nodes/arrows distinguish earlier requirements, orange nodes/arrows distinguish later courses, and the selected course has its own stronger outline. The graph occupies the full width, with course information below it, a minimap, a center-course action, and a starting zoom that keeps neighboring columns visible. Corequisites and OR alternatives keep separate labels and legend explanations; list descriptions distinguish required courses from alternative options. Phone screens still start with the course list. The minimap can be toggled and starts off in narrow layouts to avoid covering courses.

Browser checks with fictional courses verify full-chain defaults, node selection, direct/all scopes, both arrow colors, OR/corequisite labels, list navigation, neighboring-card visibility in a narrow desktop panel, and phone layouts without page overflow. All 25 automated tests, TypeScript, ESLint, and the production build pass.
