# PathWise

PathWise is a browser-based curriculum planner. Import a JSON export from the companion extension or a saved OneMCL curriculum HTML page. The file is parsed in the browser and remains in memory for the current session.

## Use the website

PathWise runs in a web browser on Windows and macOS; it does not need a desktop installer. After the site is hosted, open its website address in a recent version of Chrome, Edge, Firefox, or Safari. Choose **Open your curriculum**, then select your exported `.json` or saved OneMCL `.html` file in the file picker. Your curriculum stays in that browser session and is not uploaded to the server. Use **Save plan** to download a `.pathwise.json` file that preserves your planned terms, course statuses, pins, and the original course offerings. Reopen that saved file with **Open your curriculum** to continue later.

The file picker works the same way on both systems:

- **Windows:** Browse to the folder where you saved the export, such as Downloads, and select the `.json` or `.html` file.
- **macOS:** In the file picker, open Downloads (or the folder where you saved the export) and select the `.json` or `.html` file. Safari, Chrome, and Firefox can use the site; no app installation or special file permission is needed.

## Run PathWise locally

For development, install Node.js 22 LTS or newer (Next.js requires Node.js 20.9 or newer), Git, and pnpm. Download Node.js from [nodejs.org](https://nodejs.org/en/download/). After installing Node.js, open a **new** terminal window and install pnpm:

```sh
npm install --global pnpm
```

### Windows

Install [Git for Windows](https://git-scm.com/download/win) if `git` is not already available. Open PowerShell and run:

```powershell
git clone https://github.com/DwytMCL/PathWise.git
cd PathWise
pnpm install
pnpm dev
```

Open `http://localhost:3000` in your browser. Keep the PowerShell window open while developing; press **Ctrl+C** there to stop the server. If `node`, `npm`, or `pnpm` is reported as an unknown command after installation, close PowerShell, open it again, and check `node --version`, `npm --version`, and `pnpm --version`.

### macOS

Install [Git](https://git-scm.com/install/mac) if needed (Xcode Command Line Tools also provides Git). Open Terminal and run:

```sh
git clone https://github.com/DwytMCL/PathWise.git
cd PathWise
pnpm install
pnpm dev
```

Open `http://localhost:3000` in Safari, Chrome, or Firefox. Keep Terminal open while developing; press **Control+C** there to stop the server. If Terminal cannot find `node`, `npm`, or `pnpm`, quit and reopen Terminal after installation, then check `node --version`, `npm --version`, and `pnpm --version`.

The GitHub release contains the cross-platform web app source code. GitHub provides source archives; this release does not contain a `.dmg`, `.app`, or Windows installer.

## Developer commands

```sh
pnpm install
pnpm dev
```

Run `pnpm test`, `pnpm lint`, and `pnpm build` before preparing a release. With a preview running, `pnpm check:preview` verifies the graph positioning styles are delivered with the initial page.

The repository does not bundle a student's curriculum. Each user imports their own file. The 18-unit upper and 12-unit lower workload thresholds are illustrative, and offering-delay warnings assume a course repeats only in its original term. Confirm institutional rules and actual offerings before using a simulated plan for enrollment.

## Design direction

- **User:** A student checking how course prerequisites affect a future enrollment plan.
- **Job:** Understand the required course sequence and test changes before making enrollment decisions.
- **Primary action:** Import a curriculum. After import, choose a starting academic year/term and unit limit, then select **Find earliest path**. Preview the route before applying it to the term board.
- **Reading order:** A centered invitation to find the earliest path, the import action, a generic planning illustration, the three-step workflow, and a privacy note. In the workspace: curriculum identity, earliest-path controls, projected finish and next courses, a finish chain, then a chronological course schedule. The term board and graph support manual exploration.
- **Visual character:** The supplied TemplateMo Catalyst reference guides the rounded panels, large headline, framed preview, and feature cards. Its neon green accent is replaced with soft blue. The illustration uses generic course labels; actual planning begins only after a user imports their file. The workspace keeps its dense planning controls and status colors.

The adapted landing credits [TemplateMo's Catalyst template](https://templatemo.com/tm-618-the-catalyst). No testimonials, users, awards, or outcome metrics are invented.

## Pre-ship review

| Area | Result |
| --- | --- |
| Specificity and hierarchy | The first screen names the curriculum task, file types, import action, and the planning views created from an imported curriculum. |
| Content and trust | The app uses uploaded course data only. Workload thresholds and annual offering estimates are explicitly conditional. The personal reference curriculum is excluded from GitHub. |
| States | Checked initial, empty term, invalid JSON with recovery, imported success, disabled Undo, changed status, blocked chain, and long title. File reading has a busy label. Permission state is not applicable because no account or device permission is requested. |
| Responsive | Checked 320 px, 768 px, and 1280 px with no page-level horizontal overflow. The term board scrolls within its own region; the dialog wraps long content. |
| Accessibility | Checked keyboard focus and Escape on the native course dialog, a keyboard-operable graph course selector, text alternatives for colored paths, visible focus CSS, and WCAG AA text contrast on landing, workspace, graph, and dialog. Reduced-motion preference disables smooth scrolling. |
| Performance and resilience | The production build succeeds. Graph code loads only when needed; meaningful landing content renders in the initial HTML. Import and simulation run in the browser without server data storage. |

Actual course offering schedules, school-specific enrollment limits, and a brand identity remain to be supplied if those need to become authoritative rather than illustrative.

## Earliest-path planning

- The original imported `term` is the recurring annual offering. Moving a course changes its planned date, never its offering. A course offered in term 3 waits until the next term 3 if its prerequisites finish too late.
- Taken and exempted courses are excluded. Failed, dropped, and incomplete courses are scheduled as retakes. The optional current-load assumption only satisfies those courses after their planned term ends.
- Prerequisites must finish before the course; corequisites may finish with or before it. Missing requirements, cycles, incompatible corequisite offerings, and impossible unit loads prevent a complete finish-date claim.
- The planner compares two deterministic scheduling orders under the selected unit cap. An uncapped schedule supplies a lower bound. It labels the result earliest under the assumptions only when the capped finish matches that bound; otherwise it says earliest found and explains that a faster route may exist. It does not claim to solve every capacity-constrained optimum.
- Every future course is assumed passed. Original year placement does not impose a year-standing restriction. Additional school rules absent from the export are not modeled.
- **Use this plan** changes planned dates in one undoable action. It preserves statuses and original availability. The chronological preview remains available when switching views.

The graph keeps its controls outside the canvas, focuses on a selected course at readable zoom, uses left-to-right prerequisite arrows, and shows dashed corequisite links. The React Flow stylesheet is loaded by the root layout so switching away and back cannot remove essential positioning styles.

Verification uses synthetic records only: small cases for annual waits, corequisites, missing/cyclic requirements, current-load assumptions and undo; a 90-course scheduling invariant check; and a 72-course browser exercise. Browser checks cover route generation, apply/undo, recovery from an impossible unit cap, graph view switching, and responsive layout.
