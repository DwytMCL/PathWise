"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Download, GitBranch, GraduationCap, LayoutGrid, LockKeyhole, RotateCcw, Route, Search, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import EarliestPath from "./EarliestPath";
import Landing from "./Landing";
import OfferingEditor from "./OfferingEditor";
import CoursePriority from "./CoursePriority";
import ScenarioManager from "./ScenarioManager";
import SetupReview from "./SetupReview";
import MoveReview from "./MoveReview";
import useDevicePlan from "./useDevicePlan";
import { analyze, formatRequirements, isOffered, normalizeCurriculum, offeringLabel, offeringSource, parseCurriculumHtml, statuses, termIndex, type Course } from "@/lib/curriculum";
import { isPlanFile, parseWorkspaceFile, serializePlanFile } from "@/lib/plan-file";
import { useCurriculumStore } from "@/lib/store";
import { isComplete, planCurriculum } from "@/lib/planner";
import { previewMove } from "@/lib/planning-insights";
import { defaultOptions, type PlanningWorkspace } from "@/lib/workspace";

const CurriculumGraph = dynamic(() => import("./CurriculumGraph"), { ssr: false, loading: () => <div className="graph-loading">Preparing graph…</div> });
type View = "path" | "board" | "graph";
const EMPTY_COURSES: Course[] = [];

function statusLabel(status: Course["status"]) {
  return ({ InCurrentLoad: "In current load", NotYetTaken: "Not yet taken" } as Record<string, string>)[status] ?? status;
}

export default function PathWiseApp() {
  const { curriculum, options, scenarios, history, load, setStatus, setOfferings, setOptions, move, releasePlacement, applyPlan, saveScenario, restoreScenario, renameScenario, deleteScenario, undo, clear } = useCurriculumStore();
  const workspace = useMemo<PlanningWorkspace | null>(() => curriculum && options ? { curriculum, options, scenarios } : null, [curriculum, options, scenarios]);
  const device = useDevicePlan(workspace);
  const [setupActive, setSetupActive] = useState(false);
  const [routeSettingsDirty, setRouteSettingsDirty] = useState(false);
  const previouslyOpenRef = useRef(false);
  const [view, setView] = useState<View>("path");
  const [graphCourse, setGraphCourse] = useState<string | null>(null);
  const [importVersion, setImportVersion] = useState(0);
  const [error, setError] = useState("");
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [pendingExit, setPendingExit] = useState(false);
  const [replacement, setReplacement] = useState<File | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [recentMove, setRecentMove] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [addedYears, setAddedYears] = useState(0);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    code: string;
    year: number;
    term: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const exitDialogRef = useRef<HTMLDialogElement>(null);
  const planActionsRef = useRef<HTMLElement | null>(null);
  const exitWasOpenRef = useRef(false);
  const savedWorkspaceRef = useRef<PlanningWorkspace | null>(null);
  const moveTriggerRef = useRef<HTMLElement | null>(null);
  const plannedTermRef = useRef<HTMLSelectElement | null>(null);
  const courseTriggerRef = useRef<HTMLElement | null>(null);
  const courses = curriculum?.courses ?? EMPTY_COURSES;
  const searchResults = courseQuery.trim() ? courses.filter(c => `${c.code} ${c.title}`.toLowerCase().includes(courseQuery.trim().toLowerCase())).slice(0, 8) : [];
  const analysis = useMemo(() => analyze(courses), [courses]);
  const selectedCourse = courses.find((course) => course.code === selected);
  const routePlan = useMemo(() => options ? planCurriculum(courses, options) : null, [courses, options]);
  const movePreview = useMemo(() => pendingMove && options ? previewMove(courses, pendingMove.code, (pendingMove.year - 1) * 3 + pendingMove.term, options) : null, [pendingMove, courses, options]);
  const pendingCourse = courses.find(course => course.code === pendingMove?.code);
  useEffect(() => {
    if (!curriculum && previouslyOpenRef.current) document.getElementById("main-content")?.focus();
    previouslyOpenRef.current = curriculum !== null;
  }, [curriculum]);
  useEffect(() => {
    if (importVersion > 0) document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [importVersion]);
  useEffect(() => {
    function protectChanges(event: BeforeUnloadEvent) {
      if (routeSettingsDirty || (history.length && workspace !== savedWorkspaceRef.current && workspace !== device.lastSaved)) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", protectChanges);
    return () => window.removeEventListener("beforeunload", protectChanges);
  }, [workspace, device.lastSaved, history.length, routeSettingsDirty]);
  useEffect(() => {
    if (pendingExit || replacement) {
      exitDialogRef.current?.showModal(); exitWasOpenRef.current = true;
    } else {
      exitDialogRef.current?.close();
      if (exitWasOpenRef.current) planActionsRef.current?.focus();
      exitWasOpenRef.current = false;
    }
  }, [pendingExit, replacement]);
  useEffect(() => {
    if (!selected) {
      if (courseTriggerRef.current?.isConnected) courseTriggerRef.current.focus();
      courseTriggerRef.current = null;
      return;
    }
    courseTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [selected]);
  useEffect(() => {
    const confirmDialog = confirmDialogRef.current;
    if (pendingMove) {
      confirmDialog?.showModal();
    } else {
      confirmDialog?.close();
      if (moveTriggerRef.current?.isConnected) moveTriggerRef.current.focus();
      moveTriggerRef.current = null;
    }
  }, [pendingMove]);
  useEffect(() => {
    if (!recentMove || selected || pendingMove) return;
    const course = courses.find(c => c.code === recentMove);
    if (!course || view === "graph") { setRecentMove(null); return; }
    const target = document.getElementById(`${view === "path" ? "route" : "board"}-course-${recentMove}`);
    if (!target && view === "path") {
      setYearFilter(course.year); setHideCompleted(false); setView("board");
      return;
    }
    for (let parent = target?.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
    setRecentMove(null);
  }, [recentMove, selected, pendingMove, courses, view]);
  const terms = useMemo(() => {
    const count = (Math.max(1, ...courses.map((course) => Math.max(course.originalYear, course.year))) + addedYears) * 3;
    return Array.from({ length: count }, (_, index) => ({ year: Math.floor(index / 3) + 1, term: index % 3 + 1, index: index + 1 }));
  }, [courses, addedYears]);
  const selectableTerms = useMemo(() => {
    const maxYear = Math.max(5, ...courses.map((c) => Math.max(c.originalYear, c.year)), Math.floor(terms.length / 3));
    return Array.from({ length: maxYear * 3 }, (_, index) => ({
      year: Math.floor(index / 3) + 1,
      term: (index % 3) + 1,
      index: index + 1,
    }));
  }, [courses, terms.length]);

  const availableYears = useMemo(() => {
    const maxYear = Math.max(1, ...terms.map((t) => t.year));
    return Array.from({ length: maxYear }, (_, i) => i + 1);
  }, [terms]);

  const filteredTerms = useMemo(() => {
    return terms.filter(({ year, index }) => {
      if (yearFilter !== "all" && year !== yearFilter) return false;
      if (hideCompleted) {
        const termCourses = courses.filter((c) => termIndex(c) === index);
        if (termCourses.length > 0 && termCourses.every((c) => c.status === "Taken" || c.status === "Exempted")) {
          return false;
        }
      }
      return true;
    });
  }, [terms, yearFilter, hideCompleted, courses]);

  function openWorkspace(next: PlanningWorkspace, review: boolean) {
    const parsed = next.curriculum;
    const missingCodes = analyze(parsed.courses).missing;
    setImportWarnings([
      ...parsed.courses.flatMap(course => course.requirementWarnings ?? []),
      ...(missingCodes.length ? [`Requirements reference codes not included in this file: ${missingCodes.join(", ")}.`] : []),
    ]);
    load(parsed, next); setRouteSettingsDirty(false); setSetupActive(review); setImportVersion(v => v + 1); setGraphCourse(null); setSelected(null); setRecentMove(null); setPendingMove(null); setView("path"); setAddedYears(0); setYearFilter(Math.min(Math.max(1, parsed.yearLevel), Math.max(...parsed.courses.map(c => c.year)))); setHideCompleted(false); setCourseQuery(""); setAnnouncement(""); window.scrollTo(0, 0);
  }

  async function importFile(file?: File, confirmed = false) {
    if (!file) return;
    if (curriculum && (history.length || routeSettingsDirty) && !confirmed) { setReplacement(file); if (inputRef.current) inputRef.current.value = ""; return; }
    setBusy(true); setError("");
    try {
      if (!/\.(json|html?|aspx)$/i.test(file.name)) throw new Error("Choose a .json or saved .html curriculum file.");
      const text = await file.text();
      const json = /\.json$/i.test(file.name);
      const parsedInput = json ? JSON.parse(text) : null;
      const saved = isPlanFile(parsedInput);
      const next = saved ? parseWorkspaceFile(parsedInput) : (() => {
        const curriculum = json ? normalizeCurriculum(parsedInput) : parseCurriculumHtml(text);
        return { curriculum, options: defaultOptions(curriculum), scenarios: [] };
      })();
      device.pause(); openWorkspace(next, !saved);
    } catch (cause) { setError(cause instanceof SyntaxError ? "This JSON file could not be read. Check the export and try again." : cause instanceof Error ? cause.message : "This file could not be read."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  function dropFile(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void importFile(file);
  }

  function requestMove(code: string, year: number, term: number) {
    const course = courses.find((c) => c.code === code);
    if (!course) return;
    if (course.year === year && course.term === term) return;
    moveTriggerRef.current = selected ? plannedTermRef.current : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPendingMove({ code, year, term });
  }

  function placeCourse(code: string, year: number, term: number) {
    move(code, year, term);
    setRecentMove(code);
    if (view === "board") { if (yearFilter !== "all") setYearFilter(year); setHideCompleted(false); }
  }

  function switchView(next: View) {
    if (setupActive) return;
    setView(next);
    document.getElementById("main-content")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function undoChange() {
    const previousPlacement = history.at(-1)?.curriculum.courses.find(previous => courses.some(current =>
      current.code === previous.code && current.isPinned &&
      (current.year !== previous.year || current.term !== previous.term)
    ));
    undo();
    if (previousPlacement) {
      setRecentMove(previousPlacement.code);
      if (view === "board" && yearFilter !== "all") setYearFilter(previousPlacement.year);
      setHideCompleted(false);
    }
    setAnnouncement("Last change undone. Your previous plan is restored.");
  }

  function quickShift(code: string, delta: number) {
    const course = courses.find((c) => c.code === code);
    if (!course) return;
    const currentIndex = termIndex(course);
    const targetIndex = currentIndex + delta;
    if (targetIndex < 1) return;
    const targetYear = Math.floor((targetIndex - 1) / 3) + 1;
    const targetTerm = ((targetIndex - 1) % 3) + 1;
    requestMove(code, targetYear, targetTerm);
  }

  function moveCourse(event: DragEvent<HTMLElement>, year: number, term: number) {
    event.preventDefault();
    const code = event.dataTransfer.getData("text/plain") || dragged;
    if (code && courses.some((course) => course.code === code)) {
      requestMove(code, year, term);
    }
    setDragged(null);
  }

  const remaining = courses.filter((course) => !["Taken", "Exempted"].includes(course.status)).reduce((sum, course) => sum + course.creditUnits, 0);
  const overloaded = [...analysis.loads].filter(([, units]) => units > 18);
  const underloaded = [...analysis.loads].filter(([index, units]) => units > 0 && units < 12 && courses.some((course) => termIndex(course) === index && !["Taken", "Exempted"].includes(course.status)));

  function exportPlan() {
    if (!curriculum) return;
    const lines: string[] = [];
    lines.push(`PathWise Degree Plan: ${curriculum.program}`);
    if (curriculum.curriculumYear) lines.push(`Curriculum Year: ${curriculum.curriculumYear}`);
    lines.push(`Generated: ${new Date().toLocaleDateString()}`);
    lines.push(`Total Courses: ${courses.length} | Units Remaining: ${remaining}`);
    lines.push("=".repeat(60));
    lines.push("");

    terms.forEach(({ year, term, index }) => {
      const termCourses = courses.filter((c) => termIndex(c) === index);
      const units = analysis.loads.get(index) ?? 0;
      lines.push(`YEAR ${year}, TERM ${term} (${units} units)`);
      lines.push("-".repeat(40));
      if (termCourses.length === 0) {
        lines.push("  (No courses scheduled)");
      } else {
        termCourses.forEach((c) => {
          const flags: string[] = [];
          if (c.status !== "NotYetTaken") flags.push(statusLabel(c.status));
          if (c.isPinned) flags.push("PINNED");
          if (!isOffered(c, c.term)) flags.push(`OFF-TERM (${offeringLabel(c)})`);
          if (analysis.blocked.has(c.code)) flags.push("BLOCKED");
          const flagStr = flags.length ? ` [${flags.join(", ")}]` : "";
          lines.push(`  * ${c.code.padEnd(10)} ${c.title} (${c.creditUnits}u)${flagStr}`);
        });
      }
      lines.push("");
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pathwise-plan-${curriculum.program.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function savePlanFile() {
    if (routeSettingsDirty) { setAnnouncement("Update my route to apply your edited settings before downloading a plan."); return; }
    if (!workspace) return;
    const blob = new Blob([serializePlanFile(workspace.curriculum, workspace)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pathwise-${workspace.curriculum.program.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-plan.pathwise.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    savedWorkspaceRef.current = workspace;
    setAnnouncement("Your plan file is ready. Reopen it in PathWise to continue later.");
  }

  return <div className={`site-shell ${curriculum ? "has-plan" : "has-landing"}`}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div role="status" className="sr-only">{curriculum && !setupActive ? "Your plan is ready. Review your projected finish and next courses in My route." : ""}</div>
    {curriculum && <>
      <aside className="workspace-rail">
        <div className="workspace-rail-content">
          <Link className="brand" href="/" aria-label="PathWise home" onClick={e => { e.preventDefault(); setPendingExit(true); }}><Image src="/pathwise-logo.svg" alt="PathWise" width={152} height={39} priority /></Link>
          <div className="rail-program"><span><GraduationCap size={21} /></span><div><strong>{curriculum.program}</strong><small>{curriculum.curriculumYear ? `${curriculum.curriculumYear} curriculum` : "My curriculum"}</small></div></div>
          <nav className="workspace-view-nav" aria-label="Plan views">
            <button disabled={setupActive} aria-pressed={view === "path"} onClick={() => switchView("path")}><Route size={17} /> My route</button>
            <button disabled={setupActive} aria-pressed={view === "board"} onClick={() => switchView("board")}><LayoutGrid size={17} /> Term board</button>
            <button disabled={setupActive} aria-pressed={view === "graph"} onClick={() => switchView("graph")}><GitBranch size={17} /> Dependencies</button>
          </nav>
          <div className="rail-privacy"><LockKeyhole size={17} /><p>Your file.<br />Your device.<br />Your bigger picture.</p><small>Download your plan or enable device autosave to keep your changes.</small></div>
        </div>
      </aside>
      <header className="topbar"><span className="workspace-breadcrumb">{view === "path" ? "My route" : view === "board" ? "Term board" : "Dependencies"}<ChevronRight size={13} /><span>{curriculum.program}</span></span><span className="session-label"><LockKeyhole size={14} /> {device.enabled ? "Device autosave on" : "Private browser session"}</span></header>
    </>}
    {announcement && <div className="action-notice" role="status"><Check size={17} /><span>{announcement}</span>{history.length > 0 && <button onClick={undoChange}>Undo</button>}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setAnnouncement("")}><X size={16} /></button></div>}
    {error && <div className="file-error" role="alert"><strong>Could not open the curriculum.</strong><span>{error}</span><button type="button" onClick={() => inputRef.current?.click()}>Choose another file</button><button type="button" className="icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
    {!curriculum && (device.draft || device.error) && <section className="device-resume" aria-labelledby="resume-title"><div><span className="section-index">CONTINUE WHERE YOU LEFT OFF</span><h2 id="resume-title">{device.draft ? device.draft.workspace.curriculum.program : "Saved plan on this device"}</h2><p>{device.draft?.savedAt ? `Last saved ${new Date(device.draft.savedAt).toLocaleString()}.` : "A plan may be saved in this browser."} Anyone using this browser can access a saved plan.</p>{device.error && <p className="inline-error" role="alert">{device.error}</p>}</div><div>{device.draft && <button className="primary-button" onClick={() => { if (device.draft) { openWorkspace(device.draft.workspace, false); device.enable(); } }}>Resume saved plan <ArrowRight size={16} /></button>}<button className="text-button" onClick={device.forget}>Forget saved plan on this device</button></div></section>}
    {!curriculum ? <main id="main-content" tabIndex={-1} className="landing" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
      <Landing onOpen={() => inputRef.current?.click()} busy={busy} />
    </main> : <main id="main-content" tabIndex={-1} className="workspace">

      {importWarnings.length > 0 && <details className="import-review"><summary><AlertTriangle size={17} /> {importWarnings.length} imported requirement{importWarnings.length === 1 ? "" : "s"} to review</summary><ul>{importWarnings.map((warning,i) => <li key={i}>{warning}</li>)}</ul><button className="text-button" onClick={() => setView("board")}>Review plan checks <ArrowRight size={15} /></button></details>}
      <header className="workspace-header"><div className="workspace-heading"><div><h1>{setupActive ? "Make it your plan." : view === "path" ? "My route" : view === "board" ? "Term board" : "Dependencies"}</h1><p>{courses.length} courses · {remaining} units remaining{curriculum.specialization && curriculum.specialization !== "Unassigned" ? ` · ${curriculum.specialization}` : ""}</p></div><div className="workspace-actions"><button className="secondary-button" disabled={routeSettingsDirty} onClick={savePlanFile}><Download size={16} /> Save plan</button><button className="text-button" onClick={undoChange} disabled={!history.length} aria-label="Undo last change"><RotateCcw size={16} /><span className="action-label">Undo</span></button><details className="plan-menu"><summary ref={planActionsRef} className="icon-button" aria-label="More plan actions"><ChevronDown size={18} /></summary><div><button disabled={routeSettingsDirty} onClick={e => { setSetupActive(true); setView("path"); e.currentTarget.closest("details")?.removeAttribute("open"); }}>Review my setup</button><button onClick={e => { exportPlan(); e.currentTarget.closest("details")?.removeAttribute("open"); }}><Download size={16} /> Export as text</button><button onClick={e => { inputRef.current?.click(); e.currentTarget.closest("details")?.removeAttribute("open"); }} disabled={busy}><Upload size={16} /> {busy ? "Reading file…" : "Open another file"}</button><button onClick={e => { setPendingExit(true); e.currentTarget.closest("details")?.removeAttribute("open"); }}><X size={16} /> Close plan</button></div></details></div></div>
      <section className="device-controls" aria-label="Device autosave">
        <details><summary><LockKeyhole size={14} />Device saving · {device.enabled ? "On" : "Off"}<ChevronDown size={14} /></summary><p id="device-saving-help">Saves your courses, scenarios and applied settings in this browser. Anyone using this browser can resume your plan. Leave this off on a shared device.</p><label><input type="checkbox" aria-describedby="device-saving-help" checked={device.enabled} onChange={e => e.target.checked ? device.enable() : device.forget()} />Remember this plan on this device</label>{device.draft && <button className="text-button" onClick={device.forget}>Forget saved plan</button>}</details>
        <span role="status">{device.error ? "Not saved on this device" : device.enabled ? device.lastSaved === workspace ? routeSettingsDirty ? "Applied route saved · Edited settings are not saved yet" : device.message : "Saving on this device…" : device.message || "Save a file to keep your work"}</span>
        {device.error && <div className="device-error" role="alert"><p>{device.error}</p>{device.enabled && <button className="text-button" onClick={device.retry}>Try autosave again</button>}</div>}
      </section>
      {routeSettingsDirty && !setupActive && <p className="path-notice" role="status">Edited route settings are not saved yet. Open My route and select Update my route before saving.</p>}
      {!setupActive && <div className="workspace-context"><div className="degree-progress"><span>{courses.filter(isComplete).length} of {courses.length} completed</span><progress value={courses.filter(isComplete).length} max={courses.length} aria-label="Completed courses" /></div><div className="course-search"><label htmlFor="course-search"><Search size={17} /><span className="sr-only">Find a course by code or title</span></label><input id="course-search" type="search" placeholder="Find a course…" value={courseQuery} onChange={e => setCourseQuery(e.target.value)} />{courseQuery.trim() && <div className="search-results"><span>{searchResults.length ? "Matching courses" : "No courses match. Try a code or title."}</span>{searchResults.map(c => <button key={c.code} onClick={() => { setSelected(c.code); setCourseQuery(""); }}><strong>{c.code}</strong><span>{c.title}</span><ArrowRight size={15} /></button>)}</div>}</div></div>}
      </header>
      {setupActive && options ? <SetupReview onDraftChange={setRouteSettingsDirty} key={importVersion} curriculum={curriculum} options={options} onStatus={setStatus} onOfferings={setOfferings} onDone={next => { setOptions(next); setRouteSettingsDirty(false); setSetupActive(false); setView("path"); setImportVersion(v => v + 1); document.getElementById("main-content")?.focus({ preventScroll: true }); window.scrollTo(0, 0); setAnnouncement(""); }} /> : <div className={`workspace-grid ${view !== "board" ? "workspace-wide" : ""}`}><div className="main-column">
      <div hidden={view !== "path"}><EarliestPath onDraftChange={setRouteSettingsDirty} planningOptions={options ?? undefined} onOptionsChange={setOptions} key={importVersion} courses={courses} yearLevel={curriculum.yearLevel} onApply={assignments => { applyPlan(assignments); setAnnouncement("Suggested dates applied to your plan. You can undo this change."); }} onSelect={setSelected} onTrace={code => { setGraphCourse(code); setView("graph"); document.querySelector(".workspace-heading")?.scrollIntoView({ block: "start" }); }} onBoard={() => setView("board")} />{options && routePlan && <ScenarioManager settingsDirty={routeSettingsDirty} curriculum={curriculum} options={options} plan={routePlan} scenarios={scenarios} onSave={name => { saveScenario(name); setAnnouncement(`Scenario “${name.trim()}” saved. Download your plan or enable autosave to keep it.`); }} onRestore={id => { restoreScenario(id); setSelected(null); setRecentMove(null); setImportVersion(v => v + 1); setYearFilter("all"); setHideCompleted(false); setAnnouncement("Scenario restored, including its progress and offerings. Undo is available."); switchView("path"); }} onRename={(id, name) => { renameScenario(id, name); setAnnouncement("Scenario renamed. Undo is available."); }} onDelete={id => { deleteScenario(id); setAnnouncement("Scenario removed. Undo is available."); }} />}</div>
      {view === "board" ? <>
        <div className="board-toolbar">
          <div className="year-pills" role="group" aria-label="Filter terms by year">
            <span className="toolbar-label">Year filter:</span>
            <button
              type="button"
              aria-pressed={yearFilter === "all"}
              className={`pill-btn ${yearFilter === "all" ? "active" : ""}`}
              onClick={() => setYearFilter("all")}
            >
              All Years
            </button>
            {availableYears.map((yr) => (
              <button
                type="button"
                key={yr}
                aria-pressed={yearFilter === yr}
                className={`pill-btn ${yearFilter === yr ? "active" : ""}`}
                onClick={() => setYearFilter(yr)}
              >
                Year {yr}
              </button>
            ))}
          </div>
          <label className="hide-completed-toggle">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
            />
            <span>Hide completed terms</span>
          </label>
        </div>

        {filteredTerms.length === 0 ? (
          <div className="no-terms-msg">
            <p>No terms match the current filter.</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => { setYearFilter("all"); setHideCompleted(false); }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="term-board" aria-label="Courses by planned term">
            {filteredTerms.map(({ year, term, index }) => {
              const termCourses = courses.filter((course) => termIndex(course) === index);
              const units = analysis.loads.get(index) ?? 0;
              return (
                <section
                  className={`term-column ${dragged ? "drop-ready" : ""}`}
                  key={index}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => moveCourse(event, year, term)}
                >
                  <header>
                    <div>
                      <span>YEAR {year}</span>
                      <h2>Term {term}</h2>
                    </div>
                    <div className="term-load-indicator">
                      <div className="term-load-info">
                        <strong>{units} units</strong>
                        {units > 18 ? (
                          <span className="load-badge badge-overload">HIGH LOAD</span>
                        ) : units > 0 && units < 12 && termCourses.some((c) => !["Taken", "Exempted"].includes(c.status)) ? (
                          <span className="load-badge badge-underload">LIGHT LOAD</span>
                        ) : null}
                      </div>
                      <div className="term-meter-track" title={`${units} units (Reference range: 12-18 units)`}>
                        <div
                          className={`term-meter-bar ${units > 18 ? "bar-overload" : units < 12 && units > 0 ? "bar-underload" : "bar-normal"}`}
                          style={{ width: `${Math.min(100, Math.round((units / 21) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </header>
                  <div className="term-list">
                    {termCourses.length ? (
                      termCourses.map((course) => {
                        const isOffTerm = !isOffered(course, course.term);
                        const isBlocked = analysis.blocked.has(course.code);

                        return (
                          <div
                            key={course.code}
                            className="course-card-wrapper"
                          >
                            <button
                              id={`board-course-${course.code}`}
                              type="button"
                              draggable
                              className={`course-card ${isBlocked ? "blocked" : ""}`}
                              onClick={() => setSelected(course.code)}
                              onDragStart={(event) => {
                                setDragged(course.code);
                                event.dataTransfer.setData("text/plain", course.code);
                              }}
                              onDragEnd={() => setDragged(null)}
                            >
                              <span className="course-card-top">
                                <strong>{course.code}</strong>
                                <span>{course.creditUnits}u</span>
                              </span>
                              <span className="course-title">{course.title}</span>
                              <span className="course-offering">{offeringSource(course)} · {offeringLabel(course)}</span>
                              <span className="card-badge-row">
                                {course.isPinned && <span className="card-badge badge-pinned">PINNED</span>}
                                {isOffTerm && <span className="card-badge badge-offterm">OFF-TERM</span>}
                                {isBlocked && <span className="card-badge badge-blocked">BLOCKED</span>}
                              </span>
                              <span className={`status status-${course.status.toLowerCase()}`}>
                                {statusLabel(course.status)}
                              </span>
                            </button>
                            <div className="quick-shift-bar" aria-label={`Shift ${course.code}`}>
                              <button
                                type="button"
                                className="shift-btn"
                                onClick={() => quickShift(course.code, -1)}
                                disabled={index <= 1}
                                title="Move one term earlier"
                                aria-label={`Move ${course.code} to previous term`}
                              >
                                <ChevronLeft size={13} />
                              </button>
                              <span className="shift-label">Shift</span>
                              <button
                                type="button"
                                className="shift-btn"
                                onClick={() => quickShift(course.code, 1)}
                                title="Move one term later"
                                aria-label={`Move ${course.code} to next term`}
                              >
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="empty-term">Nothing scheduled here.<br />Move a course using its details.</p>
                    )}
                  </div>
                </section>
              );
            })}
            <div className="extend-plan">
              <button type="button" onClick={() => setAddedYears((years) => years + 1)} disabled={terms.length >= 30}>
                Add another year <ArrowRight size={16} />
              </button>
              <p>Extend the board to test a later graduation date.</p>
            </div>
          </div>
        )}
      </> : view === "graph" ? <CurriculumGraph courses={courses} blocked={analysis.blocked} onSelect={setSelected} onBoard={(code) => { setYearFilter(courses.find(c => c.code === code)?.year ?? "all"); setHideCompleted(false); setSelected(code); setView("board"); }} initialCourse={graphCourse} /> : null}</div>
      {view === "board" && <aside className="insights" aria-live="polite"><h2>Plan signals</h2><p className="insights-intro">Changes update these checks immediately.</p>{analysis.blocked.size === 0 && overloaded.length === 0 && underloaded.length === 0 && !analysis.missing.length && !analysis.offeringConflicts.length && !courses.some(c => c.requirementWarnings?.length) ? <div className="signal-clear"><Check size={18} /><div><strong>No issues found</strong><p>Try moving a course or changing its status to test a scenario.</p></div></div> : <div className="signals">{analysis.offeringConflicts.length > 0 && <div className="signal"><span className="signal-tag">TERM OFFERING</span><strong>{analysis.offeringConflicts.length} outside their offering terms</strong><p>{analysis.offeringConflicts.map(c => `${c.code}: ${offeringLabel(c)}, planned term ${c.term}`).join("; ")}. Open My route to review suggested dates.</p></div>}{analysis.blocked.size > 0 && <div className="signal"><span className="signal-tag">PREREQUISITES</span><strong>{analysis.blocked.size} course{analysis.blocked.size === 1 ? "" : "s"} blocked</strong><p>{[...analysis.blocked].slice(0, 3).map(([code, reasons]) => `${code} needs ${reasons.join(", ")}`).join(" · ")}{analysis.blocked.size > 3 ? " · …" : ""}</p></div>}{analysis.availabilityRisks.slice(0, 3).map((risk) => <div className="signal" key={`season-${risk.code}`}><span className="signal-tag">OFFERING RISK</span><strong>{risk.code} could wait {risk.terms} term{risk.terms === 1 ? "" : "s"}</strong><p>Under its configured offerings, the next modeled opening is in Year {risk.nextYear}. Confirm the actual schedule.</p></div>)}{(overloaded.length > 0 || underloaded.length > 0) && <div className="signal"><span className="signal-tag">WORKLOAD</span><strong>Check unit load in {(overloaded.length + underloaded.length)} term{(overloaded.length + underloaded.length) === 1 ? "" : "s"}</strong><p>{overloaded.length > 0 && `Above 18 units: ${overloaded.map(([index, units]) => `Y${Math.floor((index - 1) / 3) + 1}T${((index - 1) % 3) + 1} (${units}u)`).join(", ")}. `}{underloaded.length > 0 && `Below 12 units: ${underloaded.map(([index, units]) => `Y${Math.floor((index - 1) / 3) + 1}T${((index - 1) % 3) + 1} (${units}u)`).join(", ")}. `}These thresholds are illustrative; check your institution’s rules.</p></div>}{analysis.missing.length > 0 && <div className="signal"><span className="signal-tag">DATA CHECK</span><strong>Unmatched requirement codes</strong><p>{analysis.missing.slice(0, 5).join(", ")}. These may refer to courses outside this file.</p></div>}{courses.some(c => c.requirementWarnings?.length) && <div className="signal"><span className="signal-tag">IMPORT CHECK</span><strong>Requirement text to review</strong><p>{courses.flatMap(c => c.requirementWarnings ?? []).slice(0, 5).join(" ")}</p></div>}</div>}<div className="insights-foot">Offerings follow your imported or custom terms. Open My route to rebuild a schedule around them.</div></aside>}</div>}</main>}
    {(pendingExit || replacement) && <dialog ref={exitDialogRef} className="confirm-dialog" aria-labelledby="exit-title" onClose={() => { setPendingExit(false); setReplacement(null); }}><div className="dialog-head"><span className="section-index">KEEP YOUR PROGRESS</span><button className="icon-button" aria-label="Keep working" onClick={() => { setPendingExit(false); setReplacement(null); }}><X size={18} /></button></div><h2 id="exit-title">Before you {replacement ? "open another file" : "close your plan"}</h2><p>Download a copy to keep your courses, settings and scenarios. If device autosave is enabled, its saved copy also remains available on this device.</p>{routeSettingsDirty && <p className="inline-error" role="alert">Your edited route settings have not been applied or saved. Keep working and {setupActive ? "finish your setup review" : "select Update my route"} to keep them.</p>}{device.enabled && device.error && <p className="inline-error" role="alert">{device.error}</p>}<button className="secondary-button" disabled={routeSettingsDirty} onClick={savePlanFile}><Download size={16} /> Save a copy</button><div className="confirm-actions"><button className="text-button" onClick={() => { setPendingExit(false); setReplacement(null); }}>Keep working</button><button className="primary-button" onClick={() => { if (device.enabled && !device.error && !device.flush()) return; if (replacement) { const file = replacement; setReplacement(null); void importFile(file, true); } else { device.pause(); clear(); setRouteSettingsDirty(false); setSetupActive(false); window.scrollTo(0, 0); setRecentMove(null); setPendingExit(false); setImportWarnings([]); setAnnouncement(""); setCourseQuery(""); } }}>{device.enabled && device.error ? replacement ? "Open file without autosaving" : "Close without autosaving" : routeSettingsDirty ? replacement ? "Open file without applying settings" : "Close without applying settings" : replacement ? "Open selected file" : "Close plan"}</button></div></dialog>}
    <input ref={inputRef} type="file" accept=".json,.html,.htm,.aspx,application/json,text/html" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void importFile(event.target.files?.[0])} />
    {selectedCourse && <dialog ref={dialogRef} className="course-dialog" aria-labelledby="course-heading" onClose={() => setSelected(null)}>
      <div className="dialog-head"><span className="section-index">COURSE DETAILS</span><button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="Close details"><X size={19} /></button></div>
      <h2 id="course-heading">{selectedCourse.title}</h2><p className="dialog-code">{selectedCourse.code} · {selectedCourse.creditUnits} units</p>
      {selectedCourse.description && <p className="course-description">{selectedCourse.description}</p>}
      <div className="detail-list"><div><span>{offeringSource(selectedCourse)}</span><strong>{offeringLabel(selectedCourse)}</strong><p>{selectedCourse.offeredTerms ? "You set these planning terms." : "Based on original placement in your file."} Confirm with your school.</p>{!isOffered(selectedCourse, selectedCourse.term) && <p className="offering-warning">Your planned term is outside these offerings. Choose an available term or allow the planner to reschedule this placement.</p>}</div><div><span>Prerequisites</span><strong>{formatRequirements(selectedCourse.prerequisiteGroups, selectedCourse.prerequisites) || "None listed"}</strong></div><div><span>Corequisites</span><strong>{formatRequirements(selectedCourse.corequisiteGroups, selectedCourse.corequisites) || "None listed"}</strong></div>
        {analysis.blocked.has(selectedCourse.code) && <div className="detail-alert"><span>Needs attention</span><strong>Blocked by {analysis.blocked.get(selectedCourse.code)?.join(", ")}</strong></div>}
        {selectedCourse.isPinned && <div className="detail-alert manual-placement"><span>Manual placement</span><strong>Kept in Year {selectedCourse.year} · Term {selectedCourse.term}</strong><button className="text-button" onClick={() => { releasePlacement(selectedCourse.code); setAnnouncement(`${selectedCourse.code} can now be rescheduled in suggested routes. Undo is available.`); }}>Allow planner to reschedule</button></div>}
      </div>
      <OfferingEditor course={selectedCourse} onChange={terms => { setOfferings(selectedCourse.code, terms); setAnnouncement(`${selectedCourse.code} offerings updated. The suggested route has recalculated. Undo is available.`); }} />
      {options && <CoursePriority courses={courses} code={selectedCourse.code} options={options} />}
      <div className="dialog-fields"><label>Status <span className="select-wrap"><select value={selectedCourse.status} onChange={event => { setStatus(selectedCourse.code, event.target.value as Course["status"]); setAnnouncement(`${selectedCourse.code} status updated. Undo is available.`); }}>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><ChevronDown size={16} /></span></label><label>Planned term <span className="select-wrap"><select ref={plannedTermRef} value={termIndex(selectedCourse)} onChange={event => { const index = Number(event.target.value); requestMove(selectedCourse.code, Math.floor((index - 1) / 3) + 1, ((index - 1) % 3) + 1); }}>{selectableTerms.map(({ year, term, index }) => <option key={index} value={index}>Year {year} · Term {term}{index > terms.length ? " (Extend to Year " + year + ")" : ""}</option>)}</select><ChevronDown size={16} /></span></label></div>
      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => { setSelected(null); setYearFilter(selectedCourse.year); setHideCompleted(false); setView("board"); }}>View on term board <ArrowRight size={13} /></button><button className="text-button" onClick={() => { setSelected(null); setGraphCourse(selectedCourse.code); setView("graph"); }}>Trace requirements <GitBranch size={15} /></button></div>
      <p className="dialog-note">Originally listed in Year {selectedCourse.originalYear}, Term {selectedCourse.originalTerm}. Download your plan or enable autosave to keep your changes.</p>
    </dialog>}
    {pendingMove && pendingCourse && movePreview && <MoveReview dialogRef={confirmDialogRef} course={pendingCourse} destination={(pendingMove.year - 1) * 3 + pendingMove.term} preview={movePreview} onCancel={() => setPendingMove(null)} onConfirm={() => { placeCourse(pendingMove.code, pendingMove.year, pendingMove.term); setAnnouncement(`${pendingMove.code} moved to Year ${pendingMove.year}, Term ${pendingMove.term}.${movePreview.offeringConflict ? " Outside its configured offerings; confirm with your school." : ""} Undo is available.`); setPendingMove(null); }} />}

  </div>;
}
