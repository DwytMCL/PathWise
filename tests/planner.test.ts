import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCurriculum } from "../lib/curriculum";
import { planCurriculum } from "../lib/planner";
import { useCurriculumStore } from "../lib/store";

const options = { startTerm: 1, maxUnits: 18, assumeCurrentPass: true };
const courses = (rows: object[]) => normalizeCurriculum({ courses: rows }).courses;

test("a term 3 offering waits for the next year when its prerequisite finishes in term 3", () => {
  const input = courses([
    { code: "A", year: 1, term: 3, creditUnits: 3 },
    { code: "B", year: 2, term: 3, creditUnits: 3, prerequisites: ["A"] },
  ]);
  input[1].term = 1; // A manual move must not change availability.
  const plan = planCurriculum(input, options);
  assert.equal(plan.assignments.get("A"), 3);
  assert.equal(plan.assignments.get("B"), 6);
  assert.equal(plan.finish, 6);
  assert.equal(plan.earliestPossibleFinish, 6);
  assert.deepEqual(plan.criticalPath, ["A", "B"]);
});

test("OR prerequisites let the route use the available alternative", () => {
  const input = courses([
    { code: "A", year: 1, term: 1, creditUnits: 3 },
    { code: "B", year: 1, term: 3, creditUnits: 3 },
    { code: "TARGET", year: 1, term: 2, creditUnits: 3, prerequisites: "A or B" },
  ]);
  assert.deepEqual(input[2].prerequisiteGroups, [["A", "B"]]);
  const plan = planCurriculum(input, options);
  assert.equal(plan.assignments.get("A"), 1);
  assert.equal(plan.assignments.get("TARGET"), 2);
  assert.equal(plan.assignments.get("B"), 3);
});

test("AND prerequisites still require every listed course", () => {
  const input = courses([
    { code: "A", year: 1, term: 1, creditUnits: 3 },
    { code: "B", year: 1, term: 3, creditUnits: 3 },
    { code: "TARGET", year: 1, term: 2, creditUnits: 3, prerequisites: "A and B" },
  ]);
  const plan = planCurriculum(input, options);
  assert.equal(plan.assignments.get("TARGET"), 5);
});

test("the planner respects load limits and prioritizes courses that unlock later work", () => {
  const input = courses([
    { code: "FREE", year: 1, term: 1, creditUnits: 3 },
    { code: "A", year: 1, term: 1, creditUnits: 3 },
    { code: "B", year: 1, term: 2, creditUnits: 3, prerequisites: ["A"] },
    { code: "C", year: 2, term: 1, creditUnits: 3, prerequisites: ["B"] },
  ]);
  const plan = planCurriculum(input, { ...options, maxUnits: 3 });
  assert.equal(plan.assignments.get("A"), 1);
  for (const index of new Set(plan.assignments.values())) {
    assert.ok(input.filter(c => plan.assignments.get(c.code) === index).reduce((s, c) => s + c.creditUnits, 0) <= 3);
  }
  assert.equal(plan.assignments.size, 4);
});

test("mutual corequisites run together, but incompatible offerings are unresolved", () => {
  const input = courses([
    { code: "LECT", year: 1, term: 2, creditUnits: 3, corequisites: ["LAB"] },
    { code: "LAB", year: 1, term: 2, creditUnits: 1, corequisites: ["LECT"] },
  ]);
  const plan = planCurriculum(input, options);
  assert.equal(plan.assignments.get("LECT"), 2);
  assert.equal(plan.assignments.get("LAB"), 2);
  assert.equal(planCurriculum(input, { ...options, maxUnits: 3 }).finish, null);
  input[1].originalTerm = 3;
  assert.equal(planCurriculum(input, options).unresolved.length, 2);
});

test("an OR corequisite can be fulfilled by one course available that term", () => {
  const input = courses([
    { code: "LECT", year: 1, term: 2, corequisites: "LABA or LABB", creditUnits: 3 },
    { code: "LABA", year: 1, term: 3, creditUnits: 1 },
    { code: "LABB", year: 1, term: 1, creditUnits: 1 },
  ]);
  const plan = planCurriculum(input, options);
  assert.equal(plan.assignments.get("LABB"), 1);
  assert.equal(plan.assignments.get("LECT"), 2);
  assert.equal(plan.assignments.get("LABA"), 3);
});

test("missing dependencies and prerequisite cycles never produce a graduation claim", () => {
  const input = courses([
    { code: "DONE", year: 1, term: 1, status: "Taken" },
    { code: "MISSING", year: 1, term: 2, prerequisites: ["DONE", "OUTSIDE"] },
    { code: "A", year: 1, term: 1, prerequisites: ["B"] },
    { code: "B", year: 1, term: 2, prerequisites: ["A"] },
  ]);
  const plan = planCurriculum(input, options);
  assert.equal(plan.finish, null);
  assert.equal(plan.unresolved.length, 3);
  assert.match(plan.unresolved.find(x => x.code === "MISSING")!.reason, /OUTSIDE/);
});

test("current load is only assumed passed after its scheduled term; failed courses are retaken", () => {
  const input = courses([
    { code: "NOW", year: 2, term: 2, status: "InCurrentLoad", creditUnits: 3 },
    { code: "NEXT", year: 2, term: 3, prerequisites: ["NOW"], creditUnits: 3 },
    { code: "RETAKE", year: 1, term: 1, status: "Failed", creditUnits: 3 },
  ]);
  const plan = planCurriculum(input, { ...options, startTerm: 5 });
  assert.equal(plan.assignments.get("NEXT"), 6);
  assert.equal(plan.assignments.get("RETAKE"), 7);
  assert.equal(plan.assignments.has("NOW"), false);
  const noAssumption = planCurriculum(input, { ...options, startTerm: 6, assumeCurrentPass: false });
  assert.equal(noAssumption.assignments.get("NOW"), 8);
  assert.equal(noAssumption.assignments.get("NEXT"), 9);
});

test("using a plan preserves statuses and original availability, and undo restores every move", () => {
  const original = normalizeCurriculum({ courses: [
    { code: "A", year: 1, term: 3, status: "Failed", creditUnits: 3 },
    { code: "B", year: 2, term: 1, prerequisites: ["A"], creditUnits: 3 },
  ] });
  useCurriculumStore.getState().load(original);
  const plan = planCurriculum(original.courses, { ...options, startTerm: 4 });
  useCurriculumStore.getState().applyPlan(plan.assignments);
  const moved = useCurriculumStore.getState().curriculum!.courses;
  assert.equal(moved[0].year, 2);
  assert.equal(moved[1].year, 3);
  assert.equal(moved[0].status, "Failed");
  assert.equal(moved[0].originalTerm, 3);
  assert.equal(useCurriculumStore.getState().history.length, 1);
  useCurriculumStore.getState().undo();
  assert.deepEqual(useCurriculumStore.getState().curriculum, original);
  useCurriculumStore.getState().clear();
});

test("a larger curriculum keeps every assignment inside its offering, load, and dependency constraints", () => {
  const input = courses(Array.from({ length: 90 }, (_, i) => ({
    code: `TEST${i}`, year: Math.floor(i / 24) + 1, term: i % 3 + 1, creditUnits: i % 7 === 0 ? 1 : 3,
    prerequisites: i >= 6 ? [`TEST${i - 6}`] : [],
  })));
  const plan = planCurriculum(input, options);
  assert.equal(plan.unresolved.length, 0);
  assert.equal(plan.assignments.size, 90);
  const loads = new Map<number, number>();
  for (const course of input) {
    const index = plan.assignments.get(course.code)!;
    assert.equal((index - 1) % 3 + 1, course.originalTerm);
    for (const pre of course.prerequisites) assert.ok(plan.assignments.get(pre)! < index);
    loads.set(index, (loads.get(index) ?? 0) + course.creditUnits);
  }
  assert.ok([...loads.values()].every(units => units <= 18));
  assert.ok(plan.finish! >= plan.earliestPossibleFinish!);
});

test("finished curricula have no artificial future completion date", () => {
  const input = courses([{ code: "A", year: 1, term: 1, status: "Exempted" }]);
  const plan = planCurriculum(input, { ...options, startTerm: 15 });
  assert.equal(plan.finish, 0);
  assert.equal(plan.assignments.size, 0);
});

test("a pinned course is scheduled at its specified term and finish extends accordingly", () => {
  const input = courses([
    { code: "SS031", year: 4, term: 2, creditUnits: 3 },
    { code: "CPE199R-1P", year: 5, term: 1, creditUnits: 3, isPinned: true }, // Pinned to Year 5 Term 1
  ]);
  // startTerm: Year 4 Term 2 (index 11)
  const plan = planCurriculum(input, { ...options, startTerm: 11 });
  assert.equal(plan.assignments.get("SS031"), 11);
  // Year 5 Term 1 is index 13: (5 - 1) * 3 + 1 = 13
  assert.equal(plan.assignments.get("CPE199R-1P"), 13);
  assert.equal(plan.finish, 13);
});
