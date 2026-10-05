# PathWise student testing kit

## Purpose

Check whether students can find a realistic route, understand its assumptions, make changes confidently, and keep their work. This is a ready-to-run kit, not a report of completed student sessions.

**Suggested group:** 5 students with a mix of early and late degree progress, including someone who has retaken a course. Include a phone user and a keyboard-only session. Allow 25–35 minutes per person. You will arrange the participants.

**Materials:** the updated PathWise preview, [fictional curriculum](../tests/fixtures/sample-curriculum.json), and [observation sheet](student-observations.csv). Download the fixture before the session. Use a fresh browser profile with no existing PathWise plan. Do not ask for real academic records, passwords, names, or student numbers.

## Moderator opening

“We’re testing PathWise, not you. Please say what you expect to happen and what you’re thinking as you use it. You can skip a task or stop at any time. We’ll record task outcomes and anonymous notes; we won’t record your screen or voice unless you separately agree. These are fictional courses and planning estimates.”

Assign an anonymous participant code such as P01. Ask their device type and whether they have used a course planner before. Avoid collecting identifiable details. Agree beforehand how notes will be kept and when they will be deleted.

## Tasks

Read the **prompt** aloud. Keep the success criteria to yourself. Start timing after the prompt. Do not name a control or explain the interface unless the participant is stuck and asks for help. Record help as an assisted outcome.

| # | Prompt to the student | Success criteria for the moderator |
| --- | --- | --- |
| 1 | Open the provided curriculum. You have completed Foundations of Mathematics. Plan to start in Year 2, Term 1 with at most 12 units per term. Find your projected finish. | Imports the fixture, checks progress and settings, reaches My route; identifies Year 3, Term 2 under the imported offerings. |
| 2 | Find Applied Mathematics. Explain why it matters and when the app thinks it is offered. Your school also offers it in Term 1. Update that assumption. | Finds MAT102 details; explains remaining connections and deferral consequences; adds Term 1 while retaining Term 2; distinguishes a custom assumption from an official offering. |
| 3 | Suppose you take Applied Mathematics in Year 3, Term 1. Find out what that would do to your finish before committing. Then cancel. | Opens the move preview, identifies a three-term delay to Year 4, Term 2 and the changed dates; cancels; original placement remains unchanged. |
| 4 | Save your current route as “Baseline.” Try a 3-unit limit and save that route as “Working part-time.” Compare them, then return to Baseline. | Applies the new limit before saving; saves two named scenarios; reads the complete schedules, not just totals; restores Baseline with its 12-unit settings. In this fixture the 3-unit route finishes in Year 4, Term 1. |
| 5 | Trace what Systems Analysis needs and what follows it. Explain the arrows and the laboratory relationship. | Uses Dependencies; identifies MAT102 upstream, PRJ301 downstream and the laboratory corequisite; can read the selected course without confusing colors with status. |
| 6 | Keep your work so you can return tomorrow on this device. Close the plan and resume it. Then remove the saved device copy as if you were on a shared computer. | Explicitly enables autosave; notices Saved feedback; closes and resumes with settings/scenarios intact; uses Forget; understands that a separately downloaded file remains a separate copy. |
| 7 | Save a portable copy, then open it again. Find your named routes and offering changes. | Downloads a .pathwise.json file and reopens it directly; settings, scenarios and custom offerings survive. |

Reset to Baseline before task 5 if a prior task failed. Record the reset as moderator assistance rather than silently correcting the result. On a shared device, use Forget before ending the session. Keep only the anonymous observation sheet; remove test downloads through the normal file-management workflow.

## Observation sheet

Use one CSV row per task per participant. Outcomes: **independent**, **assisted**, **incomplete**, or **skipped**. Record seconds, incorrect actions, assistance given, confidence (1–5), and the participant’s exact words when useful. Separate observed behavior from your interpretation. Do not fill blank rows with invented results.

If a student stops progressing, ask: “What are you looking for?” After about two minutes stuck, offer help or move on. Avoid “Was that easy?” Ask: “What did you expect?” and “What made you unsure?”

## Final questions

1. What would you do next after seeing this route?
2. Which part felt least clear?
3. Which information would you verify with your school?
4. Would you trust this finish estimate? What would increase or decrease that trust?
5. What felt unnecessary or missing?

## Accessibility checks alongside the sessions

- Keyboard: complete import, setup, offerings, scenario naming and move cancellation using Tab, Shift+Tab, Enter, Space and Escape. Check that focus returns to the triggering control after a dialog closes.
- Zoom: at 200% and 400% in a desktop browser, read and use the controls without page-level horizontal scrolling. A schedule table may scroll within its labeled region. Record the actual browser and zoom used.
- Phone: portrait width around 390 px; check long course titles, move preview scrolling, and comfortable touch controls. Also check a narrow 320 px viewport.
- Motion: with the operating system’s reduced-motion preference enabled, check that term transitions are immediate.
- Assistive technology: if a participant already uses a screen reader, invite their normal workflow. Do not claim screen-reader compatibility from keyboard checks alone.

## Deciding what to fix

**Blocker:** work is lost, a student cannot finish a core task, or a wrong finish is presented as reliable. Fix before release. **Major:** repeated confusion, unexpected placement, or help needed for a core task. **Minor:** wording, spacing or discoverability that slows the task without blocking it.

For each issue, record the task, observable behavior, affected device, evidence, severity and proposed correction. Summarize independent/assisted outcomes by task and list the recurring problems. With a small group, counts are more useful than a broad claim that the design is “validated.” Run the affected tasks again after fixing consequential issues.
