"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Download, GitBranch, LockKeyhole, RotateCcw, Route, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import EarliestPath from "./EarliestPath";
import { analyze, normalizeCurriculum, parseCurriculumHtml, statuses, termIndex, type Course } from "@/lib/curriculum";
import { useCurriculumStore } from "@/lib/store";

const CurriculumGraph = dynamic(() => import("./CurriculumGraph"), { ssr: false, loading: () => <div className="graph-loading">Preparing graph…</div> });
type View = "path" | "board" | "graph";
const EMPTY_COURSES: Course[] = [];

function statusLabel(status: Course["status"]) {
  return ({ InCurrentLoad: "In current load", NotYetTaken: "Not yet taken" } as Record<string, string>)[status] ?? status;
}

export default function PathWiseApp() {
  const { curriculum, history, load, setStatus, move, applyPlan, undo, clear } = useCurriculumStore();
  const [view, setView] = useState<View>("path");
  const [graphCourse, setGraphCourse] = useState<string | null>(null);
  const [importVersion, setImportVersion] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [addedYears, setAddedYears] = useState(0);
  const [yearFilter, setYearFilter] = useState<number | "all">("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
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
  const rawCourses = curriculum?.courses ?? EMPTY_COURSES;
  const courses = useMemo(() => {
    return rawCourses.map((c) =>
      (c.isPinned || c.year !== c.originalYear || c.term !== c.originalTerm)
        ? { ...c, isPinned: true }
        : c
    );
  }, [rawCourses]);
  const analysis = useMemo(() => analyze(courses), [courses]);
  const selectedCourse = courses.find((course) => course.code === selected);
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

  const hoverRelations = useMemo(() => {
    if (!hoveredCourse) return null;
    const course = courses.find((c) => c.code === hoveredCourse);
    if (!course) return null;
    const upstream = new Set<string>();
    const queue = [...course.prerequisites];
    while (queue.length > 0) {
      const code = queue.shift()!;
      if (!upstream.has(code)) {
        upstream.add(code);
        const pCourse = courses.find((c) => c.code === code);
        if (pCourse) queue.push(...pCourse.prerequisites);
      }
    }
    const downstream = new Set<string>();
    const dQueue = [course.code];
    while (dQueue.length > 0) {
      const current = dQueue.shift()!;
      for (const c of courses) {
        if (c.prerequisites.includes(current) && !downstream.has(c.code)) {
          downstream.add(c.code);
          dQueue.push(c.code);
        }
      }
    }
    return { current: course.code, upstream, downstream };
  }, [hoveredCourse, courses]);

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

  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (!/\.(json|html?|aspx)$/i.test(file.name)) throw new Error("Choose a .json or saved .html curriculum file.");
      const text = await file.text();
      const parsed = /\.json$/i.test(file.name) ? normalizeCurriculum(JSON.parse(text)) : parseCurriculumHtml(text);
      load(parsed); setImportVersion(v => v + 1); setGraphCourse(null); setSelected(null); setView("path"); setAddedYears(0); setYearFilter("all"); setHideCompleted(false); window.scrollTo(0, 0);
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

  return <div className="site-shell">
    <header className="topbar"><Link className="brand" href="/" aria-label="PathWise home"><Image src="/pathwise-logo.svg" alt="PathWise" width={152} height={39} priority /></Link>{!curriculum && <nav className="landing-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Privacy</a><button className="nav-import" type="button" onClick={() => inputRef.current?.click()}>Open curriculum <ArrowRight size={15} /></button></nav>}</header>
    {error && <div className="file-error" role="alert"><strong>Could not open the curriculum.</strong><span>{error}</span><button type="button" onClick={() => inputRef.current?.click()}>Choose another file</button><button type="button" className="icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
    {!curriculum ? <main className="landing" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
      <section className="template-hero" aria-labelledby="landing-title">
        <div className="hero-badge"><span className="hero-badge-dot" /> Your curriculum, a clearer way forward</div>
        <h1 id="landing-title">Find the <span>earliest path</span> through your degree.</h1>
        <p className="hero-sub">See what to take next, when a course is offered, and how each prerequisite affects your finish date.</p>
        <div className="hero-actions"><button className="primary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}><Upload size={18} />{busy ? "Reading file…" : "Open your curriculum"}</button><a className="secondary-button" href="#how-it-works">See how it works <ArrowRight size={17} /></a></div>
        <p className="hero-file-note">Drop your .json or saved OneMCL .html file here. It stays in this browser session.</p>
        <div className="hero-dashboard" aria-label="Illustration of the PathWise planning view">
          <div className="dashboard-toolbar"><div className="dashboard-dots" aria-hidden="true"><i /><i /><i /></div><span>PATHWISE / PLAN PREVIEW</span><div className="dashboard-tabs"><b>Earliest path</b><span>Term board</span><span>Graph</span></div></div>
          <div className="dashboard-body">
            <div className="preview-heading"><span>ILLUSTRATIVE ROUTE</span><strong>From prerequisite to finish.</strong><p>PathWise builds this view from your own curriculum after import.</p></div>
            <div className="preview-plan"><div className="preview-term"><span>01 / TERM 1</span><strong>Complete a prerequisite</strong><small>Unlock the next course</small></div><div className="preview-term waiting"><span>02 / TERM 2</span><strong>Wait for its offering</strong><small>The required course is offered in term 3</small></div><div className="preview-term highlighted"><span>03 / TERM 3</span><strong>Take the required course</strong><small>Continue toward completion</small></div></div>
            <div className="preview-checks"><span>THE PLAN CHECKS</span><div><Check size={17} /><span>Prerequisite order</span></div><div><CalendarDays size={17} /><span>Recurring term offerings</span></div><div><Route size={17} /><span>Your chosen unit limit</span></div><p>No sample student record is used in this illustration.</p></div>
          </div>
        </div>
      </section>
      <section className="process-section" id="how-it-works" aria-labelledby="process-title"><span className="section-kicker">HOW IT WORKS</span><h2 id="process-title">Your course list becomes a plan you can test.</h2><div className="process-grid">
        <article className="process-card"><span className="process-number">01</span><div className="process-icon"><Upload size={22} /></div><h3>Bring your curriculum</h3><p>Open the JSON from your exporter or a saved OneMCL curriculum page. PathWise reads the courses and their rules in your browser.</p><div className="process-detail">JSON <span>·</span> HTML <span>·</span> No account</div></article>
        <article className="process-card"><span className="process-number">02</span><div className="process-icon"><Route size={22} /></div><h3>Find your route</h3><p>Set your starting term and unit limit. See a chronological course plan with waiting terms and a projected finish.</p><div className="process-detail">Prerequisites <span>→</span> Offerings <span>→</span> Finish</div></article>
        <article className="process-card"><span className="process-number">03</span><div className="process-icon"><GitBranch size={22} /></div><h3>Test another path</h3><p>Move a course, change its status, or trace dependencies in the graph. Apply a suggested route with a single undoable action.</p><div className="process-detail">Term board <span>·</span> Graph <span>·</span> Undo</div></article>
      </div></section>
      <section className="privacy-section" id="privacy" aria-labelledby="privacy-title"><div className="privacy-icon"><LockKeyhole size={23} /></div><div><span className="section-kicker">BUILT AROUND YOUR FILE</span><h2 id="privacy-title">Your planning stays in this browser.</h2><p>PathWise does not send your curriculum to a server. Course offerings are inferred from the term in your file, so confirm enrollment rules with your school.</p></div><button className="primary-button" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>Open curriculum <ArrowRight size={17} /></button></section>
    </main> : <main className="workspace"><div className="workspace-heading"><div><span className="section-index">CURRICULUM WORKSPACE</span><h1>{curriculum.program} <span>/ {curriculum.curriculumYear || "your plan"}</span></h1><p>{courses.length} courses · {remaining} units not completed · {analysis.blocked.size} blocked{curriculum.specialization && curriculum.specialization !== "Unassigned" ? ` · ${curriculum.specialization}` : ""}</p></div><div className="workspace-actions"><button type="button" className="text-button" onClick={exportPlan} title="Export degree plan as text file"><Download size={16} /> Export plan</button><button type="button" className="text-button" onClick={undo} disabled={!history.length}><RotateCcw size={16} /> Undo</button><button type="button" className="text-button" onClick={() => inputRef.current?.click()}><Upload size={16} /> New file</button><button type="button" className="icon-button" onClick={clear} aria-label="Close curriculum"><X size={18} /></button></div></div>
      {view === "board" && <div className="overview"><div><span>COURSES IN PLAN</span><strong>{courses.length}</strong><small>across {terms.length} terms</small></div><div><span>UNITS NOT COMPLETED</span><strong>{remaining}</strong><small>based on course status</small></div><div><span>COURSES NEED ATTENTION</span><strong className={analysis.blocked.size ? "attention" : ""}>{analysis.blocked.size}</strong><small>blocked by prerequisites</small></div></div>}
      <div className={`workspace-grid ${view !== "board" ? "workspace-wide" : ""}`}><div className="main-column"><div className="view-bar"><div className="view-tabs" role="group" aria-label="Curriculum view"><button type="button" aria-pressed={view === "path"} className={view === "path" ? "active" : ""} onClick={() => setView("path")}>Earliest path</button><button type="button" aria-pressed={view === "board"} className={view === "board" ? "active" : ""} onClick={() => setView("board")}>Term board</button><button type="button" aria-pressed={view === "graph"} className={view === "graph" ? "active" : ""} onClick={() => setView("graph")}>Prerequisite graph</button></div><span className="view-hint">{view === "board" ? "Drag courses between terms or use the course details." : view === "graph" ? "Explore the connections behind your plan." : "Start with your next term and unit limit."}</span></div>
      <div hidden={view !== "path"}><EarliestPath key={importVersion} courses={courses} yearLevel={curriculum.yearLevel} onApply={applyPlan} onSelect={setSelected} onTrace={code => { setGraphCourse(code); setView("graph"); document.querySelector(".view-bar")?.scrollIntoView({ block: "start" }); }} onBoard={() => setView("board")} /></div>
      {view === "board" ? <>
        <div className="board-toolbar">
          <div className="year-pills" role="group" aria-label="Filter terms by year">
            <span className="toolbar-label">Year filter:</span>
            <button
              type="button"
              className={`pill-btn ${yearFilter === "all" ? "active" : ""}`}
              onClick={() => setYearFilter("all")}
            >
              All Years
            </button>
            {availableYears.map((yr) => (
              <button
                type="button"
                key={yr}
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
                          <span className="load-badge badge-overload">OVERLOAD</span>
                        ) : units > 0 && units < 12 && termCourses.some((c) => !["Taken", "Exempted"].includes(c.status)) ? (
                          <span className="load-badge badge-underload">UNDERLOAD</span>
                        ) : null}
                      </div>
                      <div className="term-meter-track" title={`${units} units (Standard: 12-18 units)`}>
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
                        const isHoverActive = hoverRelations?.current === course.code;
                        const isUpstream = hoverRelations?.upstream.has(course.code);
                        const isDownstream = hoverRelations?.downstream.has(course.code);
                        const isDimmed = hoverRelations !== null && !isHoverActive && !isUpstream && !isDownstream;
                        const isOffTerm = course.term !== course.originalTerm;
                        const isBlocked = analysis.blocked.has(course.code);

                        return (
                          <div
                            key={course.code}
                            className={`course-card-wrapper ${isDimmed ? "card-dimmed" : ""} ${isHoverActive ? "card-hover-active" : ""} ${isUpstream ? "card-hover-upstream" : ""} ${isDownstream ? "card-hover-downstream" : ""}`}
                            onMouseEnter={() => setHoveredCourse(course.code)}
                            onMouseLeave={() => setHoveredCourse(null)}
                          >
                            {isUpstream && <div className="relation-tag upstream-tag">PREREQUISITE OF HOVERED</div>}
                            {isDownstream && <div className="relation-tag downstream-tag">UNLOCKED BY HOVERED</div>}
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
                              <span className="course-offering">Offered term {course.originalTerm}</span>
                              <div className="card-badge-row">
                                {course.isPinned && <span className="card-badge badge-pinned">PINNED</span>}
                                {isOffTerm && <span className="card-badge badge-offterm">OFF-TERM</span>}
                                {isBlocked && <span className="card-badge badge-blocked">BLOCKED</span>}
                              </div>
                              <span className={`status status-${course.status.toLowerCase()}`}>
                                {isBlocked ? "Blocked" : statusLabel(course.status)}
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
                      <p className="empty-term">Drop a course here</p>
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
      </> : view === "graph" ? <CurriculumGraph courses={courses} blocked={analysis.blocked} onSelect={setSelected} onBoard={(code) => { setSelected(code); setView("board"); }} initialCourse={graphCourse} /> : null}</div>
      {view === "board" && <aside className="insights" aria-live="polite"><h2>Plan signals</h2><p className="insights-intro">Changes update these checks immediately.</p>{analysis.blocked.size === 0 && overloaded.length === 0 && underloaded.length === 0 && !analysis.missing.length && !analysis.offeringConflicts.length ? <div className="signal-clear"><Check size={18} /><div><strong>No issues found</strong><p>Try moving a course or changing its status to test a scenario.</p></div></div> : <div className="signals">{analysis.offeringConflicts.length > 0 && <div className="signal"><span className="signal-tag">TERM OFFERING</span><strong>{analysis.offeringConflicts.length} outside their offering term</strong><p>{analysis.offeringConflicts.map(c => `${c.code}: offered term ${c.originalTerm}, planned term ${c.term}`).join("; ")}. Generate an earliest path to reschedule.</p></div>}{analysis.blocked.size > 0 && <div className="signal"><span className="signal-tag">PREREQUISITES</span><strong>{analysis.blocked.size} course{analysis.blocked.size === 1 ? "" : "s"} blocked</strong><p>{[...analysis.blocked].slice(0, 3).map(([code, reasons]) => `${code} needs ${reasons.join(", ")}`).join(" · ")}{analysis.blocked.size > 3 ? " · …" : ""}</p></div>}{analysis.availabilityRisks.slice(0, 3).map((risk) => <div className="signal" key={`season-${risk.code}`}><span className="signal-tag">OFFERING RISK</span><strong>{risk.code} could wait {risk.terms} term{risk.terms === 1 ? "" : "s"}</strong><p>If offered only in its original term, the next opening is Year {risk.nextYear}. Confirm the actual schedule.</p></div>)}{(overloaded.length > 0 || underloaded.length > 0) && <div className="signal"><span className="signal-tag">WORKLOAD</span><strong>Check unit load in {(overloaded.length + underloaded.length)} term{(overloaded.length + underloaded.length) === 1 ? "" : "s"}</strong><p>{overloaded.length > 0 && `Above 18 units: ${overloaded.map(([index, units]) => `Y${Math.floor((index - 1) / 3) + 1}T${((index - 1) % 3) + 1} (${units}u)`).join(", ")}. `}{underloaded.length > 0 && `Below 12 units: ${underloaded.map(([index, units]) => `Y${Math.floor((index - 1) / 3) + 1}T${((index - 1) % 3) + 1} (${units}u)`).join(", ")}. `}These thresholds are illustrative; check your institution’s rules.</p></div>}{analysis.missing.length > 0 && <div className="signal"><span className="signal-tag">DATA CHECK</span><strong>Unmatched prerequisite codes</strong><p>{analysis.missing.slice(0, 5).join(", ")}. These may refer to courses outside this file.</p></div>}</div>}<div className="insights-foot">Offerings repeat in the original term from your file. Use Earliest path to rebuild a schedule around those offerings.</div></aside>}</div></main>}
    <input ref={inputRef} type="file" accept=".json,.html,.htm,.aspx,application/json,text/html" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => void importFile(event.target.files?.[0])} />
    {selectedCourse && <dialog ref={dialogRef} className="course-dialog" aria-labelledby="course-heading" onClose={() => setSelected(null)}><div className="dialog-head"><span className="section-index">COURSE DETAILS</span><button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="Close details"><X size={19} /></button></div><h2 id="course-heading">{selectedCourse.title}</h2><p className="dialog-code">{selectedCourse.code} · {selectedCourse.creditUnits} units</p>{selectedCourse.description && <p className="course-description">{selectedCourse.description}</p>}<div className="detail-list"><div><span>Availability</span><strong>Term {selectedCourse.originalTerm} each year</strong>{selectedCourse.term !== selectedCourse.originalTerm && <p className="offering-warning">Your planned term is outside this course’s offering. Choose term {selectedCourse.originalTerm} or generate an earliest path.</p>}</div><div><span>Prerequisites</span><strong>{selectedCourse.prerequisites.join(", ") || "None listed"}</strong></div><div><span>Corequisites</span><strong>{selectedCourse.corequisites.join(", ") || "None listed"}</strong></div>{analysis.blocked.has(selectedCourse.code) && <div className="detail-alert"><span>Needs attention</span><strong>Blocked by {analysis.blocked.get(selectedCourse.code)?.join(", ")}</strong></div>}{selectedCourse.isPinned && <div className="detail-alert" style={{ background: "var(--blue-pale)", borderColor: "var(--blue)", color: "var(--blue-dark)" }}><span>Manual Placement</span><strong>PINNED: Placed in Year {selectedCourse.year} · Term {selectedCourse.term}</strong><button type="button" style={{ border: 0, background: "transparent", color: "var(--blue-dark)", textDecoration: "underline", fontSize: "12px", cursor: "pointer", textAlign: "left", padding: 0, marginTop: "4px" }} onClick={() => move(selectedCourse.code, selectedCourse.originalYear, selectedCourse.originalTerm)}>Reset to catalog offering (Year {selectedCourse.originalYear} · Term {selectedCourse.originalTerm})</button></div>}</div><div className="dialog-fields"><label>Status <span className="select-wrap"><select value={selectedCourse.status} onChange={(event) => setStatus(selectedCourse.code, event.target.value as Course["status"])}>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><ChevronDown size={16} /></span></label><label>Planned term <span className="select-wrap"><select value={termIndex(selectedCourse)} onChange={(event) => { const index = Number(event.target.value); requestMove(selectedCourse.code, Math.floor((index - 1) / 3) + 1, ((index - 1) % 3) + 1); }}>{selectableTerms.map(({ year, term, index }) => <option key={index} value={index}>Year {year} · Term {term}{index > terms.length ? " (Extend to Year " + year + ")" : ""}</option>)}</select><ChevronDown size={16} /></span></label></div><div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}><button type="button" className="secondary-button" style={{ minHeight: "36px", padding: "6px 14px", fontSize: "12px" }} onClick={() => { setSelected(null); setView("board"); }}>View on Term board <ArrowRight size={13} /></button></div><p className="dialog-note">Originally listed in Year {selectedCourse.originalYear}, Term {selectedCourse.originalTerm}. Changes are for this session only.</p></dialog>}
    {pendingMove && <dialog ref={confirmDialogRef} className="confirm-dialog" aria-labelledby="confirm-move-title" onClose={() => setPendingMove(null)}>
      <div className="confirm-head">
        <div className="confirm-icon-wrap"><AlertTriangle size={20} aria-hidden="true" /></div>
        <div>
          <span className="section-index">COURSE AVAILABILITY NOTICE</span>
          <h3 id="confirm-move-title">Off-Term Offering Notice</h3>
        </div>
        <button type="button" className="icon-button" onClick={() => setPendingMove(null)} aria-label="Cancel move"><X size={18} /></button>
      </div>
      <div className="confirm-body">
        <p><strong>{pendingMove.code} ({pendingMove.title})</strong> is officially scheduled for <strong>Term {pendingMove.originalTerm}</strong> each academic year and might not be available during <strong>Year {pendingMove.year} · Term {pendingMove.term}</strong>.</p>
        <div className="confirm-availability-box">
          <strong>Offering schedule</strong>
          <p>If it is not offered in Term {pendingMove.term}, it is available in <strong>Term {pendingMove.originalTerm}</strong> (or whenever the department makes it available).</p>
        </div>
        <p className="confirm-subnote">You can still move it to Year {pendingMove.year} · Term {pendingMove.term} to simulate special terms, petitions, or off-cycle enrollment.</p>
      </div>
      <div className="confirm-actions">
        <button type="button" className="secondary-button" onClick={() => setPendingMove(null)}>Cancel</button>
        <button type="button" className="primary-button" onClick={() => { move(pendingMove.code, pendingMove.year, pendingMove.term); setPendingMove(null); }}>Move to Year {pendingMove.year} · Term {pendingMove.term} anyway <ArrowRight size={15} /></button>
      </div>
    </dialog>}
  </div>;
}
