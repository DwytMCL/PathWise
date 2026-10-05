import { useMemo } from "react";
import { GitBranch, Info } from "lucide-react";
import type { Course } from "@/lib/curriculum";
import { explainPriority } from "@/lib/planning-insights";
import { termLabel, type PlanOptions } from "@/lib/planner";

export default function CoursePriority({ courses, code, options }: { courses: Course[]; code: string; options: PlanOptions }) {
  const reason = useMemo(() => explainPriority(courses, code, options), [courses, code, options]);
  return <section className="course-priority" aria-label={`Why ${code} matters`}>
    <h3><GitBranch size={17} aria-hidden="true" />Why this course matters</h3>
    {reason.completed ? <p>You have already completed or been exempted from this course. It is not scheduled again.</p> : <>
      <p>{reason.connected.length ? `Connects to ${reason.connected.length} remaining course${reason.connected.length === 1 ? "" : "s"}: ${reason.connected.map(c => c.code).join(", ")}.` : "No later courses in your file depend on this course. It still counts toward completing your curriculum."}</p>
      {reason.connected.length > 0 && <small>Other prerequisites or alternatives may apply. A connection alone does not make a course eligible.</small>}
      {reason.scheduled !== null && <p>{reason.manual ? "Your manual placement keeps it in" : "The planner suggests"} <strong>{termLabel(reason.scheduled)}</strong>.</p>}
      {reason.onFinishChain && <p>It appears in the connected path ending at your suggested finish.</p>}
      {reason.nextOffering !== null && <div className="priority-consequence"><Info size={16} aria-hidden="true" /><p>Waiting until the next offering, <strong>{termLabel(reason.nextOffering)}</strong>, {reason.unresolved ? `would leave ${reason.unresolved} course${reason.unresolved === 1 ? "" : "s"} unresolved in the modeled route.` : reason.delta === null ? "does not have a complete finish estimate to compare." : reason.delta === 0 ? "keeps the same projected finish under your current assumptions." : `moves the suggested finish ${Math.abs(reason.delta)} term${Math.abs(reason.delta) === 1 ? "" : "s"} ${reason.delta > 0 ? "later" : "earlier"} under your current assumptions.`}</p></div>}
      {reason.scheduled === null && <p>This course is covered by your current-load assumption or needs its requirements reviewed. Open My route for the full result.</p>}
    </>}
  </section>;
}
