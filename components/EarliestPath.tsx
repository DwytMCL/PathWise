"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, GitCompareArrows, Info, Route, X } from "lucide-react";
import { formatRequirements, termIndex, type Course } from "@/lib/curriculum";
import { defaultStart, isComplete, planCurriculum, termLabel, type PlanOptions } from "@/lib/planner";

type Comparison = { finish: number | null; options: PlanOptions; unresolved: number };

export default function EarliestPath({ courses, yearLevel, onApply, onSelect, onTrace, onBoard }: {
  courses: Course[]; yearLevel: number; onApply: (assignments: Map<string, number>) => void;
  onSelect: (code: string) => void; onTrace: (code: string) => void; onBoard: () => void;
}) {
  const [start, setStart] = useState(() => defaultStart(courses, yearLevel));
  const [maxUnits, setMaxUnits] = useState(18);
  const [assumeCurrentPass, setAssumeCurrentPass] = useState(true);
  const [options, setOptions] = useState<PlanOptions>(() => ({ startTerm: defaultStart(courses, yearLevel), maxUnits: 18, assumeCurrentPass: true }));
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [didApply, setApplied] = useState(false);
  const settingsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (window.matchMedia("(max-width: 900px)").matches) settingsRef.current?.removeAttribute("open"); }, []);
  const plan = useMemo(() => planCurriculum(courses, options), [courses, options]);
  const applied = didApply && [...plan.assignments].every(([code, index]) => courses.some(c => c.code === code && termIndex(c) === index));
  const dirty = options.startTerm !== start || options.maxUnits !== maxUnits || options.assumeCurrentPass !== assumeCurrentPass;
  const currentLoad = courses.filter(c => c.status === "InCurrentLoad");
  const last = plan.finish ?? Math.max(options.startTerm - 1, ...plan.assignments.values());
  const indexes = Array.from({ length: Math.max(0, last - options.startTerm + 1) }, (_, i) => i + options.startTerm);
  const chain = new Set(plan.criticalPath);
  const firstTerm = plan.assignments.size ? Math.min(...plan.assignments.values()) : null;
  const nextCourses = courses.filter(c => plan.assignments.get(c.code) === firstTerm);
  const completed = courses.filter(isComplete).length;
  const difference = comparison?.finish != null && plan.finish != null ? plan.finish - comparison.finish : null;

  function courseRow(course: Course, next = false) {
    return <li key={course.code} className={chain.has(course.code) ? "on-finish-chain" : ""}>
      <button className="path-course" onClick={() => onSelect(course.code)}>
        <span className="path-course-code">{course.code}<small>{course.creditUnits} units</small></span>
        <span><strong>{course.title}</strong><small>Inferred Term {course.originalTerm} offering{course.prerequisites.length ? ` · Requires ${formatRequirements(course.prerequisiteGroups, course.prerequisites)}` : " · No prerequisites"}{course.corequisites.length ? ` · With or after ${formatRequirements(course.corequisiteGroups, course.corequisites)}` : ""}</small>
          {next && (plan.impact.get(course.code) ?? 0) > 0 && <em>Connects to {plan.impact.get(course.code)} later course{plan.impact.get(course.code) === 1 ? "" : "s"}</em>}
          {["Failed", "Dropped", "Incomplete"].includes(course.status) && <em>Retake planned · Passing grade assumed</em>}
          {course.isPinned && <em>Kept in your manually chosen term</em>}
        </span><ArrowRight size={17} aria-hidden="true" />
      </button>
      <button className="trace-link" aria-label={`Trace ${course.code}`} onClick={() => onTrace(course.code)}>Trace <Route size={14} /></button>
    </li>;
  }

  return <section className="path-planner" aria-labelledby="path-title">
    <div className="path-intro"><div><span className="section-index">YOUR NEXT STEP</span><h2 id="path-title">A plan to move you forward.</h2><p>Start with what you can take next. Explore how each choice shapes the rest.</p></div><span className="subtle-badge"><Check size={14} /> {completed} of {courses.length} courses completed</span></div>
    <div className="planner-layout">
      <aside className="planning-settings" aria-label="Planning settings">
        <details className="settings-disclosure" ref={settingsRef} open>
        <summary><span><strong>Make the plan yours</strong><small>{termLabel(start)} · {maxUnits}-unit limit</small></span><ChevronDown size={18} /></summary>
        <p>Choose when to start and a workload that fits your life.</p>
        <form className="path-form" onSubmit={e => { e.preventDefault(); setOptions({ startTerm: start, maxUnits, assumeCurrentPass }); setApplied(false); }}>
          <div className="start-fields"><label>Starting year<input type="number" min={1} max={50} required value={Math.floor((start - 1) / 3) + 1} onChange={e => setStart((Number(e.target.value) - 1) * 3 + (start - 1) % 3 + 1)} /></label><label>Starting term<select value={(start - 1) % 3 + 1} onChange={e => setStart(Math.floor((start - 1) / 3) * 3 + Number(e.target.value))}><option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option></select></label></div>
          <label>Maximum units per term<input type="number" min={1} max={60} step={.5} required value={maxUnits} onChange={e => setMaxUnits(Number(e.target.value))} /><small>A lower limit may mean a later finish.</small></label>
          {currentLoad.length > 0 && <label className="path-assumption"><input type="checkbox" checked={assumeCurrentPass} onChange={e => setAssumeCurrentPass(e.target.checked)} /><span>Assume I pass my {currentLoad.length} current course{currentLoad.length === 1 ? "" : "s"}</span></label>}
          <button className="primary-button" type="submit"><Route size={17} />Update my route</button>
        </form>
        <div className="offering-note"><Info size={17} /><div><strong>Where offerings come from</strong><p>Term numbers in your file are treated as annual offerings. For example, Term 3 repeats each year. Confirm the actual schedule with your school.</p></div></div>
        <details className="plan-assumptions"><summary>Planning assumptions</summary><p>Three terms per year. Prerequisites must finish earlier; corequisites may finish together. Passing grades are assumed. {options.assumeCurrentPass ? "Current courses count as passed after their planned term." : "Current courses are rescheduled."} Original year placement is not a standing requirement. Manual placements are kept. Additional school restrictions are not modeled.</p></details>
        </details>
      </aside>
      <div className="planning-results">
        {dirty && <div className="path-notice" role="status"><Info size={17} /><span>Your settings changed. Select <strong>Update my route</strong> to refresh this suggestion.</span></div>}
        <div className={`path-result ${dirty ? "is-stale" : ""}`}>
          <div className="path-summary" aria-live="polite"><div><span className="section-index">{plan.unresolved.length ? "ROUTE NEEDS REVIEW" : plan.assignments.size ? "PROJECTED FINISH" : currentLoad.length && options.assumeCurrentPass ? "FINISH YOUR CURRENT COURSES" : "YOU'VE COMPLETED YOUR CURRICULUM"}</span><h3>{plan.unresolved.length ? `${plan.unresolved.length} course${plan.unresolved.length === 1 ? "" : "s"} to review` : plan.finish && (plan.assignments.size || currentLoad.length) ? termLabel(plan.finish) : "Nothing left to schedule"}</h3><p>{plan.assignments.size > 0 ? `${plan.assignments.size} courses · ${Math.max(0, last - options.startTerm + 1)} terms including waits · ${options.maxUnits}-unit limit` : plan.unresolved.length ? "Review the remaining requirements below to build a complete route." : currentLoad.length && options.assumeCurrentPass ? "No future courses remain. Your finish assumes you pass every current course." : "All courses are completed or exempted. Explore them in the term board or graph."}</p>
            {plan.assignments.size > 0 && !plan.unresolved.length && <span className="confidence-label">{plan.provenEarliest ? <Check size={14} /> : <Info size={14} />}{plan.provenEarliest ? "Earliest finish under these assumptions" : "Fastest route found · A faster route may exist"}</span>}
          </div>{!plan.unresolved.length && plan.assignments.size > 0 && <button className="primary-button" disabled={dirty || applied} onClick={() => { onApply(plan.assignments); setApplied(true); }}>{applied ? <Check size={16} /> : <ArrowRight size={16} />}{applied ? "Plan applied" : "Use this plan"}</button>}</div>
          {applied && <div className="path-notice success" role="status"><Check size={17} /><span>Dates updated. <button onClick={onBoard}>View term board</button> or use Undo to restore your previous plan.</span></div>}
          {!plan.provenEarliest && !plan.unresolved.length && plan.assignments.size > 0 && <p className="path-model">We compared two scheduling orders. Without the unit limit, the earliest modeled finish is {plan.earliestPossibleFinish ? termLabel(plan.earliestPossibleFinish) : "unresolved"}.</p>}
          {plan.unresolved.length > 0 && <div className="path-problems" role="alert"><strong>A whole-curriculum finish is not available yet.</strong><p>Review these courses. The courses we can schedule still appear below.</p><ul>{plan.unresolved.map(item => <li key={item.code}><button onClick={() => onSelect(item.code)}>{item.code}</button><span>{item.reason}</span></li>)}</ul></div>}
          {firstTerm && <section className="next-term" aria-labelledby="next-title"><div className="next-heading"><div><span className="section-index">TAKE NEXT</span><h3 id="next-title">{termLabel(firstTerm)}</h3></div><span>{nextCourses.reduce((s,c) => s + c.creditUnits,0)} units · {nextCourses.length} course{nextCourses.length === 1 ? "" : "s"}</span></div>{firstTerm > options.startTerm && <p className="waiting-note"><CalendarDays size={17} /> Your first eligible offering is {firstTerm - options.startTerm} term{firstTerm - options.startTerm === 1 ? "" : "s"} after your chosen start.</p>}<ul className="path-courses">{nextCourses.map(c => courseRow(c,true))}</ul></section>}
          {plan.assignments.size > 0 && <div className="compare-section"><div><GitCompareArrows size={19} /><div><strong>Try another pace</strong><p>Keep this result, then change your settings to compare.</p></div></div><button className="secondary-button" disabled={dirty} onClick={() => setComparison({ finish: plan.finish, options: { ...options }, unresolved: plan.unresolved.length })}>{comparison ? "Replace comparison" : "Keep for comparison"}</button></div>}
          {comparison && <section className="comparison-panel" aria-label="Route comparison"><div className="comparison-heading"><h3>Your route comparison</h3><button className="icon-button" aria-label="Clear comparison" onClick={() => setComparison(null)}><X size={17} /></button></div><div className="comparison-values"><div><span>Saved result · {comparison.options.maxUnits} units</span><strong>{comparison.finish !== null && !comparison.unresolved ? termLabel(comparison.finish) : "Incomplete"}</strong><small>Starts {termLabel(comparison.options.startTerm)}</small></div><div><span>Current result · {options.maxUnits} units</span><strong>{plan.finish !== null && !plan.unresolved.length ? termLabel(plan.finish) : "Incomplete"}</strong><small>Starts {termLabel(options.startTerm)}</small></div></div><p role="status">{dirty ? "Update your route to compare the new settings." : difference === null || comparison.unresolved || plan.unresolved.length ? "Resolve the remaining courses before comparing finish dates." : difference === 0 ? "Both results have the same projected finish." : `The current result finishes ${Math.abs(difference)} term${Math.abs(difference) === 1 ? "" : "s"} ${difference > 0 ? "later" : "earlier"} than the saved result.`}</p><small>Saved result is a snapshot. It stays fixed when course data changes.</small></section>}
          {plan.criticalPath.length > 1 && <details className="finish-chain"><summary>The connected chain ending at your finish</summary><p>This scheduled dependency chain ends in the last term. Trace any course to see its requirements.</p><ol>{plan.criticalPath.map(code => <li key={code}><button onClick={() => onTrace(code)}>{code}<small>{termLabel(plan.assignments.get(code)!)}</small></button><ArrowRight size={14} aria-hidden="true" /></li>)}</ol></details>}
          {indexes.length > 0 && <section className="full-route"><div className="section-heading compact"><div><span className="section-index">THE FULL PICTURE</span><h3>Your term-by-term route</h3></div><span>{indexes.length} terms</span></div><ol className="path-timeline" aria-label="Suggested course schedule">{indexes.map((index, position) => {
            const items = courses.filter(c => plan.assignments.get(c.code) === index);
            const units = items.reduce((s,c) => s + c.creditUnits,0);
            const nextIndex = [...plan.assignments.values()].filter(i => i > index).sort((a,b) => a-b)[0];
            return <li className={`path-term ${items.length ? "" : "waiting-term"}`} key={index}><span className="term-step">{position+1}</span>{items.length ? <details open={index === firstTerm}><summary className="path-term-heading"><div><h4>{termLabel(index)}</h4><p>{items.length} course{items.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}{index === firstTerm ? " · Your next term" : ""}</p></div><meter min={0} max={options.maxUnits} value={units} aria-label={`${units} of ${options.maxUnits} units`} /></summary><ul className="path-courses">{items.map(c => courseRow(c))}</ul></details> : <div className="waiting-content"><h4>{termLabel(index)} <span>Waiting term</span></h4><p>{nextIndex ? `Next eligible courses: ${courses.filter(c => plan.assignments.get(c.code) === nextIndex).map(c => c.code).join(", ")} in ${termLabel(nextIndex)}.` : "No remaining courses can be scheduled here."}</p></div>}</li>;
          })}</ol></section>}
        </div>
      </div>
    </div>
  </section>;
}
