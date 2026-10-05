"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Flag, GitBranch, GraduationCap, Info, Layers, Route, SlidersHorizontal } from "lucide-react";
import { formatRequirements, offeringLabel, offeringSource, termIndex, type Course } from "@/lib/curriculum";
import { defaultStart, planCurriculum, termLabel, type PlanOptions } from "@/lib/planner";

export default function EarliestPath({ courses, yearLevel, onApply, onSelect, onTrace, onBoard, planningOptions, onOptionsChange, onDraftChange }: {
  courses: Course[]; yearLevel: number; onApply: (assignments: Map<string, number>) => void;
  onSelect: (code: string) => void; onTrace: (code: string) => void; onBoard: () => void;
  planningOptions?: PlanOptions; onOptionsChange?: (options: PlanOptions) => void;
  onDraftChange?: (dirty: boolean) => void;
}) {
  const [start, setStart] = useState(() => planningOptions?.startTerm ?? defaultStart(courses, yearLevel));
  const [maxUnits, setMaxUnits] = useState(planningOptions?.maxUnits ?? 18);
  const [assumeCurrentPass, setAssumeCurrentPass] = useState(planningOptions?.assumeCurrentPass ?? true);
  const [localOptions, setLocalOptions] = useState<PlanOptions>(() => ({ startTerm: defaultStart(courses, yearLevel), maxUnits: 18, assumeCurrentPass: true }));
  const options = planningOptions ?? localOptions;
  function setOptions(next: PlanOptions) { setLocalOptions(next); onOptionsChange?.(next); }
  useEffect(() => {
    if (planningOptions) { setStart(planningOptions.startTerm); setMaxUnits(planningOptions.maxUnits); setAssumeCurrentPass(planningOptions.assumeCurrentPass); }
  }, [planningOptions]);
  const [didApply, setApplied] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const plan = useMemo(() => planCurriculum(courses, options), [courses, options]);
  const applied = didApply && [...plan.assignments].every(([code, index]) => courses.some(c => c.code === code && termIndex(c) === index));
  const dirty = options.startTerm !== start || options.maxUnits !== maxUnits || options.assumeCurrentPass !== assumeCurrentPass;
  useEffect(() => { onDraftChange?.(dirty); }, [dirty, onDraftChange]);
  const currentLoad = courses.filter(c => c.status === "InCurrentLoad");
  const last = plan.finish ?? Math.max(options.startTerm - 1, ...plan.assignments.values());
  const indexes = Array.from({ length: Math.max(0, last - options.startTerm + 1) }, (_, i) => i + options.startTerm);
  const chain = new Set(plan.criticalPath);
  const firstTerm = plan.assignments.size ? Math.min(...plan.assignments.values()) : null;
  const activeTerm = selectedTerm !== null && indexes.includes(selectedTerm) ? selectedTerm : firstTerm ?? options.startTerm;
  const activeCourses = courses.filter(c => plan.assignments.get(c.code) === activeTerm);

  function choosePace(value: number) {
    setMaxUnits(value);
    setOptions({ ...options, maxUnits: value });
    setApplied(false);
  }

  function courseRow(course: Course, preview = false) {
    return <li key={course.code} className={chain.has(course.code) ? "on-finish-chain" : ""}>
      <button id={preview ? undefined : `route-course-${course.code}`} className="path-course" onClick={() => onSelect(course.code)}>
        <span className="path-course-icon" aria-hidden="true">{chain.has(course.code) ? <GitBranch size={20} /> : <Layers size={20} />}</span>
        <span className="path-course-name"><strong>{course.title}</strong><small>{course.code} · {course.creditUnits} unit{course.creditUnits === 1 ? "" : "s"}</small>
          {course.prerequisites.length > 0 && <small>Requires {formatRequirements(course.prerequisiteGroups, course.prerequisites)}</small>}
          {course.corequisites.length > 0 && <small>With or after {formatRequirements(course.corequisiteGroups, course.corequisites)}</small>}
          {["Failed", "Dropped", "Incomplete"].includes(course.status) && <em>Retake planned · Passing grade assumed</em>}
          {course.isPinned && <em>Kept in your manually chosen term</em>}
        </span>
        <span className="path-course-offering"><small>{offeringSource(course)}</small><strong>{offeringLabel(course)}</strong></span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      <button className="trace-link" aria-label={`Trace ${course.code}`} onClick={() => onTrace(course.code)}>Trace <Route size={14} /></button>
    </li>;
  }

  return <section className="path-planner" aria-labelledby="path-title">
    <h2 id="path-title" className="sr-only">Your suggested route</h2>
    <div className="planner-layout">
      <div className="planning-results">
        {dirty && <div className="path-notice" role="status"><Info size={17} /><span>Your settings changed. Select <strong>Update my route</strong> to refresh this suggestion.</span></div>}
        <div className={`path-result ${dirty ? "is-stale" : ""}`}>
          <div className="path-summary"><div className="forecast-finish"><span className="forecast-icon" aria-hidden="true"><GraduationCap size={28} /></span><div aria-live="polite"><span className="section-index">{plan.unresolved.length ? "ROUTE NEEDS REVIEW" : plan.assignments.size ? "PROJECTED FINISH" : currentLoad.length && options.assumeCurrentPass ? "FINISH YOUR CURRENT COURSES" : "YOU'VE COMPLETED YOUR CURRICULUM"}</span><h3>{plan.unresolved.length ? `${plan.unresolved.length} course${plan.unresolved.length === 1 ? "" : "s"} to review` : plan.finish && (plan.assignments.size || currentLoad.length) ? termLabel(plan.finish) : "Nothing left to schedule"}</h3><p>{plan.assignments.size > 0 ? `${plan.assignments.size} courses · ${Math.max(0, last - options.startTerm + 1)} terms including waits · ${options.maxUnits}-unit limit` : plan.unresolved.length ? "Review the remaining requirements below to build a complete route." : currentLoad.length && options.assumeCurrentPass ? "No future courses remain. Your finish assumes you pass every current course." : "All courses are completed or exempted. Explore them in the term board or graph."}</p>
            {plan.assignments.size > 0 && !plan.unresolved.length && <span className="confidence-label">{plan.provenEarliest ? <Check size={14} /> : <Info size={14} />}{plan.provenEarliest ? "Earliest finish under these assumptions" : "Fastest route found · A faster route may exist"}</span>}
          </div></div><div className="forecast-controls"><span><SlidersHorizontal size={14} /> Compare your pace</span><div className="pace-switch" role="group" aria-label="Compare course loads">{[18,12].map(limit => <button key={limit} aria-pressed={options.maxUnits === limit} disabled={dirty} onClick={() => choosePace(limit)}>{limit === 12 ? "Lighter · 12 units" : "18 units / term"}</button>)}</div>{![18,12].includes(options.maxUnits) && <small>Custom limit: {options.maxUnits} units</small>}{!plan.unresolved.length && plan.assignments.size > 0 && <button className="primary-button" disabled={dirty || applied} onClick={() => { onApply(plan.assignments); setApplied(true); }}>{applied ? <Check size={16} /> : <ArrowRight size={16} />}{applied ? "Plan applied" : "Use this plan"}</button>}</div></div>
      <div className="planning-settings">
        <details className="settings-disclosure">
        <summary><span><strong><SlidersHorizontal size={16} /> Customize your route</strong><small>{termLabel(start)} · {maxUnits}-unit limit</small></span><ChevronDown size={18} /></summary>
        <p>Choose when to start and a workload that fits your life.</p>
        <form className="path-form" onSubmit={e => { e.preventDefault(); setOptions({ startTerm: start, maxUnits, assumeCurrentPass }); setApplied(false); }}>
          <div className="start-fields"><label>Starting year<input type="number" min={1} max={50} required value={Math.floor((start - 1) / 3) + 1} onChange={e => setStart((Number(e.target.value) - 1) * 3 + (start - 1) % 3 + 1)} /></label><label>Starting term<select value={(start - 1) % 3 + 1} onChange={e => setStart(Math.floor((start - 1) / 3) * 3 + Number(e.target.value))}><option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option></select></label></div>
          <label>Maximum units per term<input type="number" min={1} max={60} step={.5} required value={maxUnits} onChange={e => setMaxUnits(Number(e.target.value))} /><small>A lower limit may mean a later finish.</small></label>
          {currentLoad.length > 0 && <label className="path-assumption"><input type="checkbox" checked={assumeCurrentPass} onChange={e => setAssumeCurrentPass(e.target.checked)} /><span>Assume I pass my {currentLoad.length} current course{currentLoad.length === 1 ? "" : "s"}</span></label>}
          <button className="primary-button" type="submit"><Route size={17} />Update my route</button>
        </form>
        <div className="offering-note"><Info size={17} /><div><strong>Where offerings come from</strong><p>Imported term numbers are treated as annual offerings. Open a course to set multiple offering terms. Custom terms are your assumptions; confirm the actual schedule with your school.</p></div></div>
        <details className="plan-assumptions"><summary>Planning assumptions</summary><p>Three terms per year. Prerequisites must finish earlier; corequisites may finish together. Passing grades are assumed. {options.assumeCurrentPass ? "Current courses count as passed after their planned term." : "Current courses are rescheduled."} Original year placement is not a standing requirement. Manual placements are kept. Additional school restrictions are not modeled.</p></details>
        </details>
      </div>
          {applied && <div className="path-notice success" role="status"><Check size={17} /><span>Dates updated. <button onClick={onBoard}>View term board</button> or use Undo to restore your previous plan.</span></div>}
          {!plan.provenEarliest && !plan.unresolved.length && plan.assignments.size > 0 && <p className="path-model">We compared two scheduling orders. Without the unit limit, the earliest modeled finish is {plan.earliestPossibleFinish ? termLabel(plan.earliestPossibleFinish) : "unresolved"}.</p>}
          {plan.unresolved.length > 0 && <div className="path-problems" role="alert"><strong>A whole-curriculum finish is not available yet.</strong><p>Review these courses. The courses we can schedule still appear below.</p><ul>{plan.unresolved.map(item => <li key={item.code}><button onClick={() => onSelect(item.code)}>{item.code}</button><span>{item.reason}</span></li>)}</ul></div>}
          {indexes.length > 0 && <div className="route-focus">
            <section key={activeTerm} className="route-current" aria-labelledby="active-term-title">
              <nav className="route-term-nav" aria-label="Choose a suggested term">{indexes.map(index => <button key={index} aria-pressed={activeTerm === index} onClick={event => { setSelectedTerm(index); event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" }); }}><span>Year {Math.floor((index - 1) / 3) + 1}</span><strong>Term {(index - 1) % 3 + 1}</strong>{index === last ? <Flag size={12} /> : <i />}</button>)}</nav>
              <div className="next-heading"><div className="active-term-heading"><span className="active-term-icon"><Layers size={20} /></span><div><span className="section-index">{activeTerm === firstTerm ? "YOUR NEXT STEP" : "A STEP AHEAD"}</span><h3 id="active-term-title">{termLabel(activeTerm)}</h3></div></div><span>{activeCourses.length} course{activeCourses.length === 1 ? "" : "s"} · {activeCourses.reduce((sum,c) => sum + c.creditUnits,0)} units</span></div>
              {firstTerm && firstTerm > options.startTerm && activeTerm === firstTerm && <p className="waiting-note"><CalendarDays size={17} /> Your first eligible offering is {firstTerm - options.startTerm} term{firstTerm - options.startTerm === 1 ? "" : "s"} after your chosen start.</p>}
              {activeCourses.length ? <ul className="path-courses">{activeCourses.map(c => courseRow(c,true))}</ul> : <div className="route-wait"><CalendarDays size={23} /><h4>A waiting term.</h4><p>No eligible courses fit this term’s offerings and requirements. Select the next term to see what follows.</p></div>}
              <p className="route-footnote">Offerings follow your imported or custom terms. Passing grades and three terms per year are assumed.</p>
            </section>
            <aside className="connected-path" aria-labelledby="connected-title"><span className="connected-icon"><GitBranch size={19} /></span><span className="section-index">THE CONNECTED PATH</span><h3 id="connected-title">One step opens<br />the next.</h3>{plan.criticalPath.length ? <ol>{plan.criticalPath.map((code,i) => <li key={code}><button onClick={() => onSelect(code)}><span>{i + 1}</span><div><small>{code}</small><strong>{courses.find(c => c.code === code)?.title}</strong><small>{termLabel(plan.assignments.get(code)!)}</small></div><ArrowRight size={13} /></button></li>)}</ol> : <p>Your remaining course requirements appear in the route.</p>}<p>This scheduled dependency chain ends in the last planned term. Open a course to see its requirements.</p></aside>
          </div>}
          {indexes.length > 0 && <details className="full-route" open={courses.some(c => c.isPinned)}><summary className="section-heading compact"><div><span className="section-index">THE FULL PICTURE</span><h3>Your term-by-term route</h3></div><span>{indexes.length} terms <ChevronDown size={16} /></span></summary><ol className="path-timeline" aria-label="Suggested course schedule">{indexes.map((index, position) => {
            const items = courses.filter(c => plan.assignments.get(c.code) === index);
            const units = items.reduce((s,c) => s + c.creditUnits,0);
            const nextIndex = [...plan.assignments.values()].filter(i => i > index).sort((a,b) => a-b)[0];
            return <li className={`path-term ${items.length ? "" : "waiting-term"}`} key={index}><span className="term-step">{position+1}</span>{items.length ? <details open={index === firstTerm || items.some(c => c.isPinned)}><summary className="path-term-heading"><div><h4>{termLabel(index)}</h4><p>{items.length} course{items.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}{index === firstTerm ? " · Your next term" : ""}</p></div><meter min={0} max={options.maxUnits} value={units} aria-label={`${units} of ${options.maxUnits} units`} /></summary><ul className="path-courses">{items.map(c => courseRow(c))}</ul></details> : <div className="waiting-content"><h4>{termLabel(index)} <span>Waiting term</span></h4><p>{nextIndex ? `Next eligible courses: ${courses.filter(c => plan.assignments.get(c.code) === nextIndex).map(c => c.code).join(", ")} in ${termLabel(nextIndex)}.` : "No remaining courses can be scheduled here."}</p></div>}</li>;
          })}</ol></details>}
        </div>
      </div>
    </div>
  </section>;
}
