import { termIndex, type Course } from "./curriculum";

export type PlanOptions = { startTerm: number; maxUnits: number; assumeCurrentPass: boolean };
export const isComplete = (course: Course) => course.status === "Taken" || course.status === "Exempted";
export const termLabel = (index: number) => `Year ${Math.floor((index - 1) / 3) + 1} · Term ${(index - 1) % 3 + 1}`;

export function defaultStart(courses: Course[], yearLevel: number) {
  const current = courses.filter(c => c.status === "InCurrentLoad");
  return current.length ? Math.max(...current.map(termIndex)) + 1 : (Math.max(1, yearLevel) - 1) * 3 + 1;
}

export function planCurriculum(courses: Course[], options: PlanOptions) {
  if (!Number.isInteger(options.startTerm) || options.startTerm < 1 || !(options.maxUnits > 0)) throw new Error("Choose a starting term and a positive unit limit.");
  const byCode = new Map(courses.map(c => [c.code, c]));
  const remaining = courses.filter(c => !isComplete(c) && !(options.assumeCurrentPass && c.status === "InCurrentLoad"));
  const successors = new Map(courses.map(c => [c.code, courses.filter(next => next.prerequisites.includes(c.code) || next.corequisites.includes(c.code)).map(next => next.code)]));
  const impact = new Map(courses.map(c => {
    const seen = new Set<string>(), queue = [...(successors.get(c.code) ?? [])];
    while (queue.length) {
      const code = queue.pop()!;
      if (seen.has(code)) continue;
      seen.add(code); queue.push(...(successors.get(code) ?? []));
    }
    return [c.code, seen.size];
  }));

  function schedule(limit: number, order: "impact" | "curriculum") {
    const finished = new Map(courses.filter(isComplete).map(c => [c.code, 0]));
    if (options.assumeCurrentPass) courses.filter(c => c.status === "InCurrentLoad").forEach(c => finished.set(c.code, termIndex(c)));
    const assignments = new Map<string, number>();
    const pending = new Set(remaining.map(c => c.code));
    const ranked = [...remaining].sort((a, b) =>
      (order === "impact" ? (impact.get(b.code)! - impact.get(a.code)!) : ((a.originalYear - b.originalYear) * 3 + a.originalTerm - b.originalTerm)) ||
      a.creditUnits - b.creditUnits || a.code.localeCompare(b.code));
    // Every schedulable chain can progress within one annual cycle per course.
    const horizon = Math.max(options.startTerm, ...courses.map(termIndex), ...finished.values()) + courses.length * 3 + 3;
    for (let index = options.startTerm; index <= horizon && pending.size; index++) {
      let load = courses.filter(c => options.assumeCurrentPass && c.status === "InCurrentLoad" && termIndex(c) === index).reduce((s, c) => s + c.creditUnits, 0);
      for (const course of ranked) {
        if (!pending.has(course.code)) continue;
        const bundle = new Set<string>();
        function include(code: string): boolean {
          if (finished.has(code)) return finished.get(code)! <= index;
          if (bundle.has(code)) return true;
          const item = byCode.get(code);
          if (!item) return false;
          if (item.isPinned ? termIndex(item) !== index : item.originalTerm !== (index - 1) % 3 + 1) return false;
          const prerequisites = item.prerequisiteGroups ?? item.prerequisites.map(pre => [pre]);
          if (prerequisites.some(group => !group.some(pre => finished.has(pre) && finished.get(pre)! < index))) return false;
          bundle.add(code);
          const corequisites = item.corequisiteGroups ?? item.corequisites.map(pre => [pre]);
          for (const group of corequisites) {
            let included = false;
            const snapshot = new Set(bundle);
            for (const alternative of group) {
              bundle.clear(); snapshot.forEach(member => bundle.add(member));
              if (include(alternative)) { included = true; break; }
            }
            if (!included) { bundle.clear(); snapshot.forEach(member => bundle.add(member)); return false; }
          }
          return true;
        }
        if (!include(course.code)) continue;
        const units = [...bundle].reduce((s, code) => s + byCode.get(code)!.creditUnits, 0);
        if (load + units > limit + 1e-8) continue;
        for (const code of bundle) { pending.delete(code); finished.set(code, index); assignments.set(code, index); }
        load += units;
      }
    }
    const finish = pending.size ? null : Math.max(0, ...assignments.values(), ...finished.values());
    return { assignments, pending, finish };
  }

  const unrestricted = schedule(Infinity, "impact");
  // ponytail: two deterministic list schedules; a solver is needed to prove every capacity-limited optimum.
  const candidates = [schedule(options.maxUnits, "impact"), schedule(options.maxUnits, "curriculum")];
  candidates.sort((a, b) => a.pending.size - b.pending.size || (a.finish ?? Infinity) - (b.finish ?? Infinity));
  const best = candidates[0];
  const unresolved = [...best.pending].map(code => {
    const course = byCode.get(code)!;
    const missing = [...course.prerequisites, ...course.corequisites].filter(pre => !byCode.has(pre));
    return { code, reason: missing.length ? `Missing from file: ${missing.join(", ")}.` : course.creditUnits > options.maxUnits ? `Requires ${course.creditUnits} units, above the ${options.maxUnits}-unit limit.` : course.isPinned ? `Manually placed in ${termLabel(termIndex(course))}, which is before starting term or prerequisites cannot finish in time.` : unrestricted.pending.has(code) ? "Dependencies form a cycle, depend on an unresolved course, or have incompatible corequisite offerings." : "The course and its required corequisites cannot fit within this unit limit." };
  });
  // Trace one chain ending at the last scheduled course. Its timing explains the completion date.
  const criticalPath: string[] = [];
  let last = [...best.assignments].sort((a, b) => b[1] - a[1] || impact.get(b[0])! - impact.get(a[0])!)[0]?.[0];
  const seen = new Set<string>();
  while (last && !seen.has(last)) {
    seen.add(last); criticalPath.unshift(last);
    last = [...byCode.get(last)!.prerequisites, ...byCode.get(last)!.corequisites]
      .filter(code => best.assignments.has(code) && !seen.has(code))
      .sort((a, b) => best.assignments.get(b)! - best.assignments.get(a)!)[0];
  }
  return { ...best, unresolved, criticalPath, impact, earliestPossibleFinish: unrestricted.finish,
    provenEarliest: best.finish !== null && best.finish === unrestricted.finish };
}

export type CurriculumPlan = ReturnType<typeof planCurriculum>;
