import { analyze, courseConnections, isOffered, termIndex, type Course } from "./curriculum";
import { isComplete, planCurriculum, type PlanOptions } from "./planner";

export function previewMove(courses: Course[], code: string, destination: number, options: PlanOptions) {
  const course = courses.find(c => c.code === code);
  if (!course || !Number.isInteger(destination) || destination < 1 || destination > 300) throw new Error("Choose a valid course and destination term.");
  const before = planCurriculum(courses, options);
  const proposed = courses.map(c => c.code === code ? { ...c, year: Math.floor((destination - 1) / 3) + 1, term: (destination - 1) % 3 + 1, isPinned: true } : c);
  const after = planCurriculum(proposed, options);
  const changed = courses.flatMap(c => {
    const previous = before.assignments.get(c.code), next = after.assignments.get(c.code);
    return previous === next ? [] : [{ code: c.code, title: c.title, before: previous ?? null, after: next ?? null }];
  });
  return {
    before, after, changed,
    placement: { before: termIndex(course), after: destination },
    delta: before.finish !== null && after.finish !== null ? after.finish - before.finish : null,
    offeringConflict: !isComplete(course) && !isOffered(course, (destination - 1) % 3 + 1),
    requirements: analyze(proposed).blocked.get(code) ?? [],
  };
}

export function explainPriority(courses: Course[], code: string, options: PlanOptions) {
  const course = courses.find(c => c.code === code);
  if (!course) throw new Error("This course is not in the curriculum.");
  const plan = planCurriculum(courses, options);
  const scheduled = plan.assignments.get(code) ?? null;
  const connections = courseConnections(courses, code, true).downstream;
  const connected = courses.filter(c => connections.has(c.code) && !isComplete(c) && !(options.assumeCurrentPass && c.status === "InCurrentLoad"));
  let nextOffering: number | null = null;
  if (scheduled !== null) {
    nextOffering = scheduled + 1;
    while (!isOffered(course, (nextOffering - 1) % 3 + 1)) nextOffering++;
  }
  const deferred = nextOffering !== null && nextOffering <= 300 ? previewMove(courses, code, nextOffering, options) : null;
  return { scheduled, nextOffering, connected, onFinishChain: plan.criticalPath.includes(code), manual: !!course.isPinned,
    completed: isComplete(course), delta: deferred?.delta ?? null, unresolved: deferred?.after.unresolved.length ?? 0 };
}
