"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Route } from "lucide-react";
import { formatRequirements, termIndex, type Course } from "@/lib/curriculum";
import { defaultStart, isComplete, planCurriculum, termLabel, type PlanOptions } from "@/lib/planner";

export default function EarliestPath({ courses, yearLevel, onApply, onSelect, onTrace, onBoard }: {
  courses: Course[]; yearLevel: number; onApply: (assignments: Map<string, number>) => void;
  onSelect: (code: string) => void; onTrace: (code: string) => void; onBoard: () => void;
}) {
  const [start, setStart] = useState(() => defaultStart(courses, yearLevel));
  const [maxUnits, setMaxUnits] = useState(18);
  const [assumeCurrentPass, setAssumeCurrentPass] = useState(true);
  const [options, setOptions] = useState<PlanOptions | null>(null);
  const [didApply, setApplied] = useState(false);
  const plan = useMemo(() => options ? planCurriculum(courses, options) : null, [courses, options]);
  const applied = didApply && !!plan && [...plan.assignments].every(([code, index]) => courses.some(c => c.code === code && termIndex(c) === index));
  const dirty = !!options && (options.startTerm !== start || options.maxUnits !== maxUnits || options.assumeCurrentPass !== assumeCurrentPass);
  const currentLoad = courses.filter(c => c.status === "InCurrentLoad");
  const remaining = courses.filter(c => !isComplete(c));
  const last = plan ? plan.finish ?? Math.max((options?.startTerm ?? start) - 1, ...plan.assignments.values()) : start - 1;
  const indexes = options ? Array.from({ length: Math.max(0, last - options.startTerm + 1) }, (_, i) => i + options.startTerm) : [];
  const chain = new Set(plan?.criticalPath);
  const firstTerm = plan?.assignments.size ? Math.min(...plan.assignments.values()) : null;

  return <section className="path-planner" aria-labelledby="path-title">
    <div className="path-intro"><div><span className="section-index">PLAN YOUR FINISH</span><h2 id="path-title">What should I take next?</h2><p>Build a term-by-term route from the courses you still need to complete.</p></div><Route size={34} aria-hidden="true" /></div>
    <form className="path-form" onSubmit={e => { e.preventDefault(); setOptions({ startTerm: start, maxUnits, assumeCurrentPass }); setApplied(false); }}>
      <label>Starting year<input type="number" min={1} max={50} required value={Math.floor((start - 1) / 3) + 1} onChange={e => setStart((Number(e.target.value) - 1) * 3 + (start - 1) % 3 + 1)} /></label>
      <label>Starting term<select value={(start - 1) % 3 + 1} onChange={e => setStart(Math.floor((start - 1) / 3) * 3 + Number(e.target.value))}><option value={1}>Term 1</option><option value={2}>Term 2</option><option value={3}>Term 3</option></select></label>
      <label>Maximum units / term<input type="number" min={1} max={60} step={.5} required value={maxUnits} onChange={e => setMaxUnits(Number(e.target.value))} /></label>
      <button className="primary-button" type="submit"><Route size={17} />{plan ? "Recalculate path" : "Find earliest path"}</button>
      {currentLoad.length > 0 && <label className="path-assumption"><input type="checkbox" checked={assumeCurrentPass} onChange={e => setAssumeCurrentPass(e.target.checked)} /> Assume I pass my {currentLoad.length} current-load course{currentLoad.length === 1 ? "" : "s"}</label>}
    </form>
    <p className="path-model">Each course repeats in the term listed in your file: a term 3 course is offered in term 3 each year. Completed courses are excluded. Set your own unit limit.</p>
    {dirty && <p className="path-notice" role="status">Settings changed. Recalculate to update the route below.</p>}
    {!plan ? <div className="path-empty"><h3>{remaining.length ? `${remaining.length} courses left to place` : "All courses are completed"}</h3><p>{remaining.length ? "Confirm when you can start. Your route will show the next available courses, waiting terms, and a projected finish." : "You can still explore your curriculum in the term board or prerequisite graph."}</p></div> : <div className={dirty ? "path-result is-stale" : "path-result"}>
      <div className="path-summary" aria-live="polite">
        <div><span>{plan.unresolved.length ? "ROUTE INCOMPLETE" : plan.assignments.size ? plan.provenEarliest ? "EARLIEST FINISH UNDER THESE ASSUMPTIONS" : "EARLIEST FINISH FOUND" : currentLoad.length && options?.assumeCurrentPass ? "FINISH YOUR CURRENT LOAD" : "ALL COURSES COMPLETED"}</span><h3>{plan.unresolved.length ? `${plan.unresolved.length} course${plan.unresolved.length === 1 ? "" : "s"} need attention` : plan.finish && (plan.assignments.size || currentLoad.length) ? termLabel(plan.finish) : "Nothing left to schedule"}</h3><p>{plan.assignments.size} courses scheduled{options && plan.finish && plan.assignments.size ? ` across ${plan.finish - options.startTerm + 1} terms, including waits` : ""}.</p>{firstTerm && <p className="path-next"><strong>Take next:</strong> {courses.filter(c => plan.assignments.get(c.code) === firstTerm).map(c => c.code).join(", ")} · {termLabel(firstTerm)}</p>}</div>
        {!plan.unresolved.length && plan.assignments.size > 0 && <button type="button" className="primary-button" disabled={dirty || applied} onClick={() => { onApply(plan.assignments); setApplied(true); }}>{applied ? "Applied to term board" : "Use this plan"}<ArrowRight size={16} /></button>}
      </div>
      {applied && <p className="path-notice" role="status">Planned dates updated. Course statuses are unchanged. <button type="button" onClick={onBoard}>View term board</button> · Undo is available above.</p>}
      {!plan.provenEarliest && !plan.unresolved.length && plan.assignments.size > 0 && <p className="path-model">This is the quickest route found by comparing two scheduling orders. A faster route may exist. Without the unit limit, the earliest possible finish is {plan.earliestPossibleFinish ? termLabel(plan.earliestPossibleFinish) : "unresolved"}.</p>}
      {plan.unresolved.length > 0 && <div className="path-problems" role="alert"><p>A finish date cannot be calculated for the whole curriculum yet. The schedulable courses appear below.</p><ul>{plan.unresolved.map(item => <li key={item.code}><button type="button" onClick={() => onSelect(item.code)}>{item.code}</button> — {item.reason}</li>)}</ul></div>}
      {plan.criticalPath.length > 1 && <div className="finish-chain"><h4>Follow the chain to your finish</h4><p>These connected courses end in the last scheduled term. Select one to trace its dependencies.</p><ol>{plan.criticalPath.map(code => <li key={code}><button type="button" onClick={() => onTrace(code)}>{code}<small>{termLabel(plan.assignments.get(code)!)}</small></button><ArrowRight size={16} aria-hidden="true" /></li>)}</ol></div>}
      <ol className="path-timeline" aria-label="Suggested course schedule">{indexes.map((index, position) => {
        const items = courses.filter(c => plan.assignments.get(c.code) === index);
        const units = items.reduce((s, c) => s + c.creditUnits, 0);
        const nextIndex = [...plan.assignments.values()].filter(i => i > index).sort((a, b) => a - b)[0];
        return <li className={`path-term ${items.length ? "" : "waiting-term"}`} key={index}><div className="path-term-heading"><span className="term-step">{position + 1}</span><div><h4>{termLabel(index)}</h4><p>{items.length ? `${items.length} course${items.length === 1 ? "" : "s"} · ${units} units${index === firstTerm ? " · Start here" : ""}` : "Waiting for the next eligible offering"}</p></div>{items.length > 0 && <meter min={0} max={options!.maxUnits} value={units} aria-label={`${units} of ${options!.maxUnits} units`} />}</div>
          {items.length ? <ul className="path-courses">{items.map(course => <li key={course.code} className={chain.has(course.code) ? "on-finish-chain" : ""}><button className="path-course" type="button" onClick={() => onSelect(course.code)}><span className="path-course-code">{course.code}<small>{course.creditUnits} unit{course.creditUnits === 1 ? "" : "s"}</small></span><span><strong>{course.title}</strong><small>Term {course.originalTerm} offering{course.prerequisites.length ? ` · After ${formatRequirements(course.prerequisiteGroups, course.prerequisites)}` : " · No prerequisites"}{course.corequisites.length ? ` · With or after ${formatRequirements(course.corequisiteGroups, course.corequisites)}` : ""}</small>{(plan.impact.get(course.code) ?? 0) > 0 && <em>Unlocks {plan.impact.get(course.code)} connected course{plan.impact.get(course.code) === 1 ? "" : "s"}</em>}{["Failed", "Dropped", "Incomplete"].includes(course.status) && <em>Planned retake — assumes you pass</em>}{course.isPinned && <em>PINNED: Manually placed in this term</em>}</span></button><button className="trace-link" type="button" aria-label={`Trace ${course.code}`} onClick={() => onTrace(course.code)}>Trace <ArrowRight size={13} /></button></li>)}</ul> : <p className="waiting-note">No remaining course can be taken here under this plan.{nextIndex ? ` Next: ${courses.filter(c => plan.assignments.get(c.code) === nextIndex).map(c => c.code).join(", ")} in ${termLabel(nextIndex)}.` : ""}</p>}
        </li>;
      })}</ol>
      <details className="plan-assumptions"><summary>How this route was calculated</summary><p>Three terms per academic year. Prerequisites finish in an earlier term; corequisites finish in the same or an earlier term. All scheduled courses are assumed passed. {options?.assumeCurrentPass ? "Current-load courses count as passed only after their planned term ends." : "Current-load courses are rescheduled along with other unfinished courses."} Original year placement is not a minimum year requirement. Unit limits, term offerings, and any additional standing or enrollment restrictions should match your school’s rules.</p></details>
    </div>}
  </section>;
}
