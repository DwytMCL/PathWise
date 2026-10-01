"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertTriangle, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Download, GitBranch, LayoutGrid, LockKeyhole, RotateCcw, Route, Search, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import EarliestPath from "./EarliestPath";
import Landing from "./Landing";
import { analyze, formatRequirements, normalizeCurriculum, parseCurriculumHtml, statuses, termIndex, type Course } from "@/lib/curriculum";
import { isPlanFile, parsePlanFile, serializePlanFile } from "@/lib/plan-file";
import { useCurriculumStore } from "@/lib/store";
import { isComplete } from "@/lib/planner";

const CurriculumGraph = dynamic(() => import("./CurriculumGraph"), { ssr: false, loading: () => <div className="graph-loading">Preparing graph…</div> });
type View = "path" | "board" | "graph";
const EMPTY_COURSES: Course[] = [];

function statusLabel(status: Course["status"]) {
  return ({ InCurrentLoad: "In current load", NotYetTaken: "Not yet taken" } as Record<string, string>)[status] ?? status;
}

export default function PathWiseApp() {
  const { curriculum, history, load, setStatus, move, releasePlacement, applyPlan, undo, clear } = useCurriculumStore();
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
  const [dragged, setDragged] = useState<string | null>(null);
  const [addedYears, setAddedYears] = useState(0);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    code: string;
    year: number;
    term: number;
    originalTerm: number;
    title: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmDialogRef = useRef<HTMLDialogElement>(null);
  const exitDialogRef = useRef<HTMLDialogElement>(null);
  const savedCoursesRef = useRef<Course[] | null>(null);
  const courses = curriculum?.courses ?? EMPTY_COURSES;
  const searchResults = courseQuery.trim() ? courses.filter(c => `${c.code} ${c.title}`.toLowerCase().includes(courseQuery.trim().toLowerCase())).slice(0, 8) : [];
  const analysis = useMemo(() => analyze(courses), [courses]);
  const selectedCourse = courses.find((course) => course.code === selected);
  useEffect(() => {
    if (importVersion > 0) document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [importVersion]);
  useEffect(() => {
    function protectChanges(event: BeforeUnloadEvent) {
      if (history.length && courses !== savedCoursesRef.current) { event.preventDefault(); event.returnValue = ""; }
    }
    window.addEventListener("beforeunload", protectChanges);
    return () => window.removeEventListener("beforeunload", protectChanges);
  }, [courses, history.length]);
  useEffect(() => {
    if (pendingExit || replacement) exitDialogRef.current?.showModal();
    else exitDialogRef.current?.close();
  }, [pendingExit, replacement]);
  useEffect(() => {
    if (!selected) return;
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
    }
  }, [pendingMove]);
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

  async function importFile(file?: File, confirmed = false) {
    if (!file) return;
    if (curriculum && history.length && !confirmed) { setReplacement(file); if (inputRef.current) inputRef.current.value = ""; return; }
    setBusy(true); setError("");
    try {
      if (!/\.(json|html?|aspx)$/i.test(file.name)) throw new Error("Choose a .json or saved .html curriculum file.");
      const text = await file.text();
      const parsedInput = /\.json$/i.test(file.name) ? JSON.parse(text) : null;
      const parsed = parsedInput ? (isPlanFile(parsedInput) ? parsePlanFile(parsedInput) : normalizeCurriculum(parsedInput)) : parseCurriculumHtml(text);
      const missingCodes = analyze(parsed.courses).missing;
      setImportWarnings([
        ...parsed.courses.flatMap(course => course.requirementWarnings ?? []),
        ...(missingCodes.length ? [`Requirements reference codes not included in this file: ${missingCodes.join(", ")}.`] : []),
      ]);
      load(parsed); setImportVersion(v => v + 1); setGraphCourse(null); setSelected(null); setView("path"); setAddedYears(0); setYearFilter(Math.min(Math.max(1, parsed.yearLevel), Math.max(...parsed.courses.map(c => c.year)))); setHideCompleted(false); setCourseQuery(""); setAnnouncement(""); window.scrollTo(0, 0);
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
    if (term !== course.originalTerm) {
      setPendingMove({
        code: course.code,
        year,
        term,
        originalTerm: course.originalTerm,
        title: course.title,
      });
    } else {
      move(code, year, term);
      setAnnouncement(`${code} moved to Year ${year}, Term ${term}. Undo is available.`);
    }
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
          if (c.term !== c.originalTerm) flags.push(`OFF-TERM (Offered T${c.originalTerm})`);
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
    if (!curriculum) return;
    const saved = { ...curriculum, courses };
    const blob = new Blob([serializePlanFile(saved)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pathwise-${curriculum.program.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-plan.pathwise.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    savedCoursesRef.current = courses;
    setAnnouncement("Your plan file is ready. Reopen it in PathWise to continue later.");
  }

  return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="topbar"><Link className="brand" href="/" aria-label="PathWise home" onClick={e => { if (curriculum) { e.preventDefault(); setPendingExit(true); } }}><Image src="/pathwise-logo.svg" alt="PathWise" width={152} height={39} priority /></Link>{!curriculum ? <nav className="landing-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Your privacy</a><button className="nav-import" onClick={() => inputRef.current?.click()} disabled={busy}>Open curriculum <ArrowRight size={15} /></button></nav> : <><span className="workspace-breadcrumb">/ <span>My degree plan</span></span><span className="session-label"><LockKeyhole size={14} /> Private browser session</span></>}</header>
    {announcement && <div className="action-notice" role="status"><Check size={17} /><span>{announcement}</span>{history.length > 0 && <button onClick={() => { undo(); setAnnouncement("Last change undone. Your previous plan is restored."); }}>Undo</button>}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setAnnouncement("")}><X size={16} /></button></div>}
    {error && <div className="file-error" role="alert"><strong>Could not open the curriculum.</strong><span>{error}</span><button type="button" onClick={() => inputRef.current?.click()}>Choose another file</button><button type="button" className="icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
    {!curriculum ? <main id="main-content" tabIndex={-1} className="landing" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
      <Landing onOpen={() => inputRef.current?.click()} busy={busy} />
    </main> : <main id="main-content" tabIndex={-1} className="workspace">
      {importWarnings.length > 0 && <details className="import-review"><summary><AlertTriangle size={17} /> {importWarnings.length} imported requirement{importWarnings.length === 1 ? "" : "s"} to review</summary><ul>{importWarnings.map((warning,i) => <li key={i}>{warning}</li>)}</ul><button className="text-button" onClick={() => setView("board")}>Review plan checks <ArrowRight size={15} /></button></details>}
      <div className="workspace-heading"><div><span className="section-index">YOUR DEGREE PLAN</span><h1>{curriculum.program}</h1><p>{curriculum.curriculumYear ? `${curriculum.curriculumYear} curriculum · ` : ""}{courses.length} courses · {remaining} units remaining{curriculum.specialization && curriculum.specialization !== "Unassigned" ? ` · ${curriculum.specialization}` : ""}</p></div><div className="workspace-actions"><button className="secondary-button" onClick={savePlanFile}><Download size={16} /> Save plan</button><button className="text-button" onClick={() => { undo(); setAnnouncement("Last change undone. Your previous plan is restored."); }} disabled={!history.length}><RotateCcw size={16} /> Undo</button><details className="plan-menu"><summary className="icon-button" aria-label="More plan actions"><ChevronDown size={18} /></summary><div><button onClick={e => { exportPlan(); e.currentTarget.closest("details")?.removeAttribute("open"); }}><Download size={16} /> Export as text</button><button onClick={e => { inputRef.current?.click(); e.currentTarget.closest("details")?.removeAttribute("open"); }} disabled={busy}><Upload size={16} /> {busy ? "Reading file…" : "Open another file"}</button><button onClick={e => { setPendingExit(true); e.currentTarget.closest("details")?.removeAttribute("open"); }}><X size={16} /> Close plan</button></div></details></div></div>
      <div className="workspace-context"><div className="degree-progress"><span>{courses.filter(isComplete).length} of {courses.length} completed</span><progress value={courses.filter(isComplete).length} max={courses.length} aria-label="Completed courses" /></div><div className="course-search"><label htmlFor="course-search"><Search size={17} /><span className="sr-only">Find a course by code or title</span></label><input id="course-search" type="search" placeholder="Find a course…" value={courseQuery} onChange={e => setCourseQuery(e.target.value)} />{courseQuery.trim() && <div className="search-results"><span>{searchResults.length ? "Matching courses" : "No courses match. Try a code or title."}</span>{searchResults.map(c => <button key={c.code} onClick={() => { setSelected(c.code); setCourseQuery(""); }}><strong>{c.code}</strong><span>{c.title}</span><ArrowRight size={15} /></button>)}</div>}</div></div>
      <div className={`workspace-grid ${view !== "board" ? "workspace-wide" : ""}`}><div className="main-column"><div className="view-bar"><nav className="view-tabs" aria-label="Plan views"><button aria-pressed={view === "path"} className={view === "path" ? "active" : ""} onClick={() => setView("path")}><Route size={17} /> My route</button><button aria-pressed={view === "board"} className={view === "board" ? "active" : ""} onClick={() => setView("board")}><LayoutGrid size={17} /> Term board</button><button aria-pressed={view === "graph"} className={view === "graph" ? "active" : ""} onClick={() => setView("graph")}><GitBranch size={17} /> Dependencies</button></nav></div>
      <div hidden={view !== "path"}><EarliestPath key={importVersion} courses={courses} yearLevel={curriculum.yearLevel} onApply={assignments => { applyPlan(assignments); setAnnouncement("Suggested dates applied to your plan. You can undo this change."); }} onSelect={setSelected} onTrace={code => { setGraphCourse(code); setView("graph"); document.querySelector(".view-bar")?.scrollIntoView({ block: "start" }); }} onBoard={() => setView("board")} /></div>
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
                        const isOffTerm = course.term !== course.originalTerm;
                        const isBlocked = analysis.blocked.has(course.code);

                        return (
                          <div
                            key={course.code}
                            className="course-card-wrapper"
                          >
                            <button
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
                              <span className="course-offering">Inferred Term {course.originalTerm} offering</span>
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
      {view === "board" && <aside className="insights" aria-live="polite"><h2>Plan signals</h2><p className="insights-intro">Changes update these checks immediately.</p>{analysis.blocked.size === 0 && overloaded.length === 0 && underloaded.length === 0 && !analysis.missing.length && !analysis.offeringConflicts.length && !courses.some(c => c.requirementWarnings?.length) ? <div className="signal-clear"><Check size={18} /><div><strong>No issues found</strong><p>Try moving a course or changing its status to test a scenario.</p></div></div> : <div className="signals">{analysis.offeringConflicts.length > 0 && <div className="signal"><span className="signal-tag">TERM OFFERING</span><strong>{analysis.offeringConflicts.length} outside their inferred offering term</strong><p>{analysis.offeringConflicts.map(c => `${c.code}: inferred term ${c.originalTerm}, planned term ${c.term}`).join("; ")}. Open My route to review suggested dates.</p></div>}{analysis.blocked.size > 0 && <div className="signal"><span className="signal-tag">PREREQUISITES</span><strong>{analysis.blocked.size} course{analysis.blocked.size === 1 ? "" : "s"} blocked</strong><p>{[...analysis.blocked].slice(0, 3).map(([code, reasons]) => `${code} needs ${reasons.join(", ")}`).join(" · ")}{analysis.blocked.size > 3 ? " · …" : ""}</p></div>}{analysis.availabilityRisks.slice(0, 3).map((risk) => <div className="signal" key={`season-${risk.code}`}><span className="signal-tag">OFFERING RISK</span><strong>{risk.code} could wait {risk.terms} term{risk.terms === 1 ? "" : "s"}</strong><p>If offered only in its original term, the next opening is Year {risk.nextYear}. Confirm the actual schedule.</p></div>)}{(overloaded.length > 0 || underloaded.length > 0) && <div className="signal"><span className="signal-tag">WORKLOAD</span><strong>Check unit load in {(overloaded.length + underloaded.length)} term{(overloaded.length + underloaded.length) === 1 ? "" : "s"}</strong><p>{overloaded.length > 0 && `Above 18 units: ${overloaded.map(([index, units]) => `Y${Math.floor((index - 1) / 3) + 1}T${((index - 1) % 3) + 1} (${units}u)`).join(", ")}. `}{underloaded.length > 0 && `Below 12 units: ${underloaded.map(([index, units]) => `Y${Math.floor((index - 1) / 3) + 1}T${((index - 1) % 3) + 1} (${units}u)`).join(", ")}. `}These thresholds are illustrative; check your institution’s rules.</p></div>}{analysis.missing.length > 0 && <div className="signal"><span className="signal-tag">DATA CHECK</span><strong>Unmatched requirement codes</strong><p>{analysis.missing.slice(0, 5).join(", ")}. These may refer to courses outside this file.</p></div>}{courses.some(c => c.requirementWarnings?.length) && <div className="signal"><span className="signal-tag">IMPORT CHECK</span><strong>Requirement text to review</strong><p>{courses.flatMap(c => c.requirementWarnings ?? []).slice(0, 5).join(" ")}</p></div>}</div>}<div className="insights-foot">Offerings repeat in the original term from your file. Open My route to rebuild a schedule around these inferred offerings.</div></aside>}</div></main>}
    {(pendingExit || replacement) && <dialog ref={exitDialogRef} className="confirm-dialog" aria-labelledby="exit-title" onClose={() => { setPendingExit(false); setReplacement(null); }}><div className="dialog-head"><span className="section-index">KEEP YOUR PROGRESS</span><button className="icon-button" aria-label="Keep working" onClick={() => { setPendingExit(false); setReplacement(null); }}><X size={18} /></button></div><h2 id="exit-title">Before you {replacement ? "open another file" : "close your plan"}</h2><p>Your plan stays in this session. Download a copy if you want to keep your dates and course statuses.</p><button className="secondary-button" onClick={savePlanFile}><Download size={16} /> Save a copy</button><div className="confirm-actions"><button className="text-button" onClick={() => { setPendingExit(false); setReplacement(null); }}>Keep working</button><button className="primary-button" onClick={() => { if (replacement) { const file = replacement; setReplacement(null); void importFile(file, true); } else { clear(); setPendingExit(false); setImportWarnings([]); setAnnouncement(""); setCourseQuery(""); } }}>{replacement ? "Open selected file" : "Close plan"}</button></div></dialog>}
    <input ref={inputRef} type="file" accept=".json,.html,.htm,.aspx,application/json,text/html" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void importFile(event.target.files?.[0])} />
    {selectedCourse && <dialog ref={dialogRef} className="course-dialog" aria-labelledby="course-heading" onClose={() => setSelected(null)}><div className="dialog-head"><span className="section-index">COURSE DETAILS</span><button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="Close details"><X size={19} /></button></div><h2 id="course-heading">{selectedCourse.title}</h2><p className="dialog-code">{selectedCourse.code} · {selectedCourse.creditUnits} units</p>{selectedCourse.description && <p className="course-description">{selectedCourse.description}</p>}<div className="detail-list"><div><span>Inferred availability</span><strong>Term {selectedCourse.originalTerm} each year</strong><p>Based on original placement in your file. Confirm with your school.</p>{selectedCourse.term !== selectedCourse.originalTerm && <p className="offering-warning">Your planned term is outside the inferred offering. Choose Term {selectedCourse.originalTerm}, or allow the planner to reschedule any manual placement and review My route.</p>}</div><div><span>Prerequisites</span><strong>{formatRequirements(selectedCourse.prerequisiteGroups, selectedCourse.prerequisites) || "None listed"}</strong></div><div><span>Corequisites</span><strong>{formatRequirements(selectedCourse.corequisiteGroups, selectedCourse.corequisites) || "None listed"}</strong></div>{analysis.blocked.has(selectedCourse.code) && <div className="detail-alert"><span>Needs attention</span><strong>Blocked by {analysis.blocked.get(selectedCourse.code)?.join(", ")}</strong></div>}{selectedCourse.isPinned && <div className="detail-alert manual-placement"><span>Manual placement</span><strong>Kept in Year {selectedCourse.year} · Term {selectedCourse.term}</strong><button className="text-button" onClick={() => { releasePlacement(selectedCourse.code); setAnnouncement(`${selectedCourse.code} can now be rescheduled in suggested routes. Undo is available.`); }}>Allow planner to reschedule</button></div>}</div><div className="dialog-fields"><label>Status <span className="select-wrap"><select value={selectedCourse.status} onChange={(event) => { setStatus(selectedCourse.code, event.target.value as Course["status"]); setAnnouncement(`${selectedCourse.code} status updated. Undo is available.`); }}>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><ChevronDown size={16} /></span></label><label>Planned term <span className="select-wrap"><select value={termIndex(selectedCourse)} onChange={(event) => { const index = Number(event.target.value); requestMove(selectedCourse.code, Math.floor((index - 1) / 3) + 1, ((index - 1) % 3) + 1); }}>{selectableTerms.map(({ year, term, index }) => <option key={index} value={index}>Year {year} · Term {term}{index > terms.length ? " (Extend to Year " + year + ")" : ""}</option>)}</select><ChevronDown size={16} /></span></label></div><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => { setSelected(null); setYearFilter(selectedCourse.year); setHideCompleted(false); setView("board"); }}>View on term board <ArrowRight size={13} /></button><button className="text-button" onClick={() => { setSelected(null); setGraphCourse(selectedCourse.code); setView("graph"); }}>Trace requirements <GitBranch size={15} /></button></div><p className="dialog-note">Originally listed in Year {selectedCourse.originalYear}, Term {selectedCourse.originalTerm}. Save your plan to keep these changes after closing.</p></dialog>}
    {pendingMove && <dialog ref={confirmDialogRef} className="confirm-dialog" aria-labelledby="confirm-move-title" onClose={() => setPendingMove(null)}>
      <div className="confirm-head">
        <div className="confirm-icon-wrap"><AlertTriangle size={20} aria-hidden="true" /></div>
        <div>
          <span className="section-index">COURSE AVAILABILITY NOTICE</span>
          <h3 id="confirm-move-title">This term may not be available</h3>
        </div>
        <button type="button" className="icon-button" onClick={() => setPendingMove(null)} aria-label="Cancel move"><X size={18} /></button>
      </div>
      <div className="confirm-body">
        <p><strong>{pendingMove.code} ({pendingMove.title})</strong> is inferred to be offered in <strong>Term {pendingMove.originalTerm}</strong> each academic year and might not be available during <strong>Year {pendingMove.year} · Term {pendingMove.term}</strong>.</p>
        <div className="confirm-availability-box">
          <strong>Offering schedule</strong>
          <p>Your file places it in <strong>Term {pendingMove.originalTerm}</strong> (or whenever the department makes it available).</p>
        </div>
        <p className="confirm-subnote">You can still move it to Year {pendingMove.year} · Term {pendingMove.term} to simulate special terms, petitions, or off-cycle enrollment.</p>
      </div>
      <div className="confirm-actions">
        <button type="button" className="secondary-button" onClick={() => setPendingMove(null)}>Cancel</button>
        <button type="button" className="primary-button" onClick={() => { move(pendingMove.code, pendingMove.year, pendingMove.term); setAnnouncement(`${pendingMove.code} moved outside its inferred offering. Check your school schedule. Undo is available.`); setPendingMove(null); }}>Move to Year {pendingMove.year} · Term {pendingMove.term} anyway <ArrowRight size={15} /></button>
      </div>
    </dialog>}
  </div>;
}
