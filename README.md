# PathWise

PathWise is a browser-based curriculum planner. Import a JSON export from the companion extension or a saved OneMCL curriculum HTML page. The file is parsed in the browser. Plans stay in the current session unless you download a copy or explicitly enable device autosave.

## Use the website

PathWise runs in a web browser on Windows and macOS; it does not need a desktop installer. After the site is hosted, open its website address in a recent version of Chrome, Edge, Firefox, or Safari. Choose **Open your curriculum**, then select your exported `.json` or saved OneMCL `.html` file in the file picker. Your curriculum stays in that browser session and is not uploaded to the server. New curriculum imports open a three-step review of progress, workload and planning assumptions. Use **Save plan** to download a `.pathwise.json` file preserving planned terms, course statuses, pins, imported and custom offerings, route settings, and named scenarios. Version 1 saved plans still open with default route settings. Reopen that saved file with **Open your curriculum** to continue later.

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

The repository does not bundle a student's curriculum. Each user imports their own file. The 18-unit upper and 12-unit lower workload thresholds are illustrative, and offering-delay warnings use the original term unless you set custom recurring offering terms. Confirm institutional rules and actual offerings before using a simulated plan for enrollment.

## Keeping and comparing plans

- **Device autosave** starts off. Enable **Remember this plan on this device** to save the workspace in this browser. The landing page offers **Resume saved plan**. Anyone using the same browser profile can resume it; leave autosave off on shared computers.
- **Forget saved plan** removes only PathWise’s device record and stops autosaving. It does not erase a downloaded file or the plan currently open in memory. Storage failures are shown explicitly; download a copy if autosave fails. Changes from another tab pause autosave to prevent silent overwrites.
- **Saved scenarios** keep named snapshots of course dates, progress, offerings and applied route settings. Compare full schedules or restore a snapshot. Rename, delete, restore, offering edits and settings changes support Undo. Keep up to 12 scenarios per workspace.
- **Why this course matters** explains actual remaining dependency connections and computes what waiting until the next offering would do to your projected finish. Connections can have other requirements or alternatives.

## Design and verification

The approved Horizon design uses bold corporate typography, soft blue accents, the supplied PathWise logo, and a familiar dependency graph. Landing illustrations contain fictional courses; no student records, testimonials or outcome metrics are bundled.

Automated tests cover scheduling, offerings, move consequences, saved-file compatibility, scenarios, Undo and storage failures. Browser checks use fictional data. A [student testing kit](docs/student-testing-kit.md) and [observation sheet](docs/student-observations.csv) are provided for participant sessions; these materials are not evidence that real student testing has already occurred.

## Earliest-path planning

- The original imported `term` is the inferred recurring annual offering. Open a course to select any combination of Terms 1–3; these custom offerings are clearly labeled planning assumptions. Moving a course changes its planned date, never its offering. A course offered only in term 3 waits until the next term 3 if its prerequisites finish too late. Every move previews its projected finish and changed suggested dates; confirming moves one course, and **Use this plan** applies the rest of the suggested schedule.
- Taken and exempted courses are excluded. Failed, dropped, and incomplete courses are scheduled as retakes. The optional current-load assumption only satisfies those courses after their planned term ends.
- Prerequisites must finish before the course; corequisites may finish with or before it. Missing requirements, cycles, incompatible corequisite offerings, and impossible unit loads prevent a complete finish-date claim.
- The planner compares two deterministic scheduling orders under the selected unit cap. An uncapped schedule supplies a lower bound. It labels the result earliest under the assumptions only when the capped finish matches that bound; otherwise it says earliest found and explains that a faster route may exist. It does not claim to solve every capacity-constrained optimum.
- Every future course is assumed passed. Original year placement does not impose a year-standing restriction. Additional school rules absent from the export are not modeled.
- **Use this plan** changes planned dates in one undoable action. It preserves statuses and original availability. The chronological preview remains available when switching views.

The graph keeps its controls outside the canvas, focuses on a selected course at readable zoom, uses left-to-right prerequisite arrows, and shows dashed corequisite links. The React Flow stylesheet is loaded by the root layout so switching away and back cannot remove essential positioning styles.

Verification uses synthetic records only: small cases for annual waits, corequisites, missing/cyclic requirements, current-load assumptions and undo; a 90-course scheduling invariant check; and a 72-course browser exercise. Browser checks cover route generation, apply/undo, recovery from an impossible unit cap, graph view switching, and responsive layout.
