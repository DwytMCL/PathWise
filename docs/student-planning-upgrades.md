# Student planning upgrades

Approved on 5 October 2026. Work stays on `codex/student-planning-upgrades` until reviewed.

## Acceptance criteria

- Optional device autosave starts off. Users can resume a stored workspace, see failures honestly, and forget it on a shared device. Curriculum data never goes to a server.
- Course offerings can repeat in any combination of Terms 1–3. Imported placements remain intact; custom assumptions are labeled. Planning, warnings, exports, Undo, graph and saved plans agree.
- Every course move previews the modeled finish, changed course dates and unresolved requirements before committing. Cancelling changes nothing.
- Priority explanations use the actual dependency graph and a calculated deferral scenario. They never claim that a connection alone satisfies all requirements.
- Named scenarios retain full curriculum state, planned schedules and planning options. Compare, restore, rename and delete them. Saved-file downloads and device autosave include scenarios; version 1 files remain readable.
- New imports have a short progress, schedule and route review. Saved workspaces resume directly. Settings remain available afterwards.
- Course rows, selected states and feedback are refined within Horizon. Keyboard access, focus visibility, touch controls, zoom and reduced motion are checked.
- A student testing kit records task completion, confusion, errors and feedback. Actual participant sessions require volunteers; automated or agent checks are not student-study results.

## Verification

Use fictional fixtures for all tests. Protect existing unrelated working changes. Test planning and serialization through public functions, then run the full suite, type checks, lint, build and browser flows. Review privacy and compatibility changes independently before committing.

## Implementation checkpoint — 6 October 2026

The features above are implemented on the development branch. Main and the published site have not been updated by this task. No dependency was added and no personal curriculum was bundled.

- **41 automated tests pass.** Coverage includes custom annual offerings, prerequisite/corequisite and load constraints, move consequences including completed/current courses, immutable scenario catalog validation, snapshot isolation, Undo, version 1 compatibility, version 2 roundtrips, requirement-warning retention, corrupt records, quota failures and scoped removal.
- **Type checks, full lint and production build pass.** The final small focus-return correction also passes type checks and targeted lint.
- **Browser checks:** fictional import through all three review stages; invalid workload rejection; custom offering editing; priority explanations; available/off-term move previews and cancellation; changed dependent dates; confirmed placement; Escape and focus return; named scenario save/compare/rename/restore; stale-settings protection; optional autosave, close/reload/resume and Forget; another tab pauses autosave. Version 1 and serialized version 2 files both reopen directly with the expected settings.
- **Layout:** desktop, 390 px and 320 px checks show no page overflow; the full comparison table scrolls inside its named keyboard-accessible region. Phone move dialogs scroll to their actions. New important form borders have 3.53:1 contrast on white; new contextual text pairs exceed 5:1. Reduced-motion CSS disables the term animation.
- **Independent reviews:** separate standards and specification reviews found draft-setting persistence gaps, weak scenario catalog validation, a setup shortcut and missing explicit placement for assignment-free courses. All findings were corrected and the reviewers confirmed resolution.

## Participant testing and remaining verification

The user will arrange students. [Testing kit](student-testing-kit.md) and [blank observation sheet](student-observations.csv) are ready. No participant outcomes have been collected or invented.

Actual 200%/400% browser zoom, operating-system reduced-motion behavior, screen-reader sessions and normal-browser download confirmation remain manual checks in the kit. The in-app browser did not change zoom through its keyboard controls and its download observer timed out; saved-file serialization and reopening were verified independently, but no completed download is claimed from that observer.

## Resume this work

Use `codex/student-planning-upgrades`; do not redo the completed feature work. Read this checkpoint and run the participant tasks. Review the local changes before any merge or publication. Preserve the unrelated `tsconfig.json` change and the user’s `motion/`, `outputs/` and `docs/research/` directories. Generated fictional evidence is under ignored `output/verification/student-planning/`.
