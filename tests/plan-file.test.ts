import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCurriculum } from "../lib/curriculum";
import { parsePlanFile, parseWorkspaceFile, serializePlanFile } from "../lib/plan-file";

test("workspace downloads retain route settings and named scenario schedules", () => {
  const curriculum = normalizeCurriculum({ program: "Example", courses: [
    { code: "A", year: 1, term: 3, creditUnits: 3, offeredTerms: [1, 3] },
  ] });
  const options = { startTerm: 4, maxUnits: 12, assumeCurrentPass: false };
  const scenario = { id: "lighter", name: "Lighter workload", savedAt: "2026-10-05T00:00:00.000Z", curriculum, options };
  const saved = JSON.parse(serializePlanFile(curriculum, { options, scenarios: [scenario] }));
  assert.equal(saved.formatVersion, 2);
  assert.deepEqual(saved.options, options);
  assert.equal(saved.scenarios[0].curriculum.courses[0].originalTerm, 3);
  assert.deepEqual(parsePlanFile(saved).courses[0].offeredTerms, [1, 3]);
  assert.deepEqual(parseWorkspaceFile(saved), { curriculum, options, scenarios: [scenario] });
});

test("version 1 plans reopen with safe default settings and no scenarios", () => {
  const curriculum = normalizeCurriculum({ yearLevel: 2, courses: [{ code: "A", year: 1, term: 3, isPinned: true, status: "Failed" }] });
  const workspace = parseWorkspaceFile({ format: "pathwise-plan", formatVersion: 1, curriculum });
  assert.deepEqual(workspace.curriculum, curriculum);
  assert.deepEqual(workspace.options, { startTerm: 4, maxUnits: 18, assumeCurrentPass: true });
  assert.deepEqual(workspace.scenarios, []);
});

test("a workspace with requirement review warnings can save and reopen its scenarios", () => {
  const curriculum = normalizeCurriculum({ courses: [{ code: "A", year: 1, term: 1, prerequisites: "faculty approval" }] });
  assert.ok(curriculum.courses[0].requirementWarnings.length > 0);
  const options = { startTerm: 1, maxUnits: 18, assumeCurrentPass: true };
  const scenario = { id: "one", name: "Review", savedAt: "2026-10-05T00:00:00Z", curriculum, options };
  const restored = parseWorkspaceFile(JSON.parse(serializePlanFile(curriculum, { options, scenarios: [scenario] })));
  assert.deepEqual(restored.curriculum.courses[0].requirementWarnings, curriculum.courses[0].requirementWarnings);
  assert.deepEqual(restored.scenarios[0].curriculum.courses[0].requirementWarnings, curriculum.courses[0].requirementWarnings);
});

test("saved workspaces reject invalid settings and mismatched or duplicate scenarios", () => {
  const curriculum = normalizeCurriculum({ program: "Example", courses: [{ code: "A", year: 1, term: 1 }] });
  const file = JSON.parse(serializePlanFile(curriculum));
  for (const maxUnits of [0, 61, "12"]) {
    assert.throws(() => parseWorkspaceFile({ ...file, options: { ...file.options, maxUnits } }), /unit limit/);
  }
  const scenario = { id: "one", name: "Example", savedAt: "2026-10-05T00:00:00Z", curriculum, options: file.options };
  assert.throws(() => parseWorkspaceFile({ ...file, scenarios: [scenario, scenario] }), /identifier/);
  assert.throws(() => parseWorkspaceFile({ ...file, scenarios: [{ ...scenario, curriculum: { ...curriculum, program: "Other" } }] }), /does not match/);
  assert.throws(() => parseWorkspaceFile({ ...file, scenarios: [{ ...scenario, name: " " }] }), /invalid name/);
  for (const change of [{ specialization: "Other" }, { units: { ...curriculum.units, required: 200 } }]) {
    assert.throws(() => parseWorkspaceFile({ ...file, scenarios: [{ ...scenario, curriculum: { ...curriculum, ...change } }] }), /does not match/);
  }
  for (const change of [{ creditUnits: 8 }, { originalTerm: 3 }, { prerequisites: ["MISSING"], prerequisiteGroups: [["MISSING"]] }, { title: "Different course" }]) {
    const altered = { ...curriculum, courses: curriculum.courses.map(c => ({ ...c, ...change })) };
    assert.throws(() => parseWorkspaceFile({ ...file, scenarios: [{ ...scenario, curriculum: altered }] }), /does not match/);
  }
});

test("saved PathWise plans reopen with placement, status, and offering data intact", () => {
  const curriculum = normalizeCurriculum({
    program: "Synthetic Program",
    curriculumYear: 2023,
    courses: [
      { code: "A", year: 1, term: 3, creditUnits: 3, status: "Failed" },
      { code: "B", year: 1, term: 2, prerequisites: "A or C", prerequisiteGroups: [["A", "C"]], creditUnits: 3 },
      { code: "C", year: 1, term: 1, creditUnits: 3 },
    ],
  });
  curriculum.courses[0].year = 3;
  curriculum.courses[0].term = 2;
  curriculum.courses[0].isPinned = true;

  const restored = parsePlanFile(JSON.parse(serializePlanFile(curriculum)));
  assert.equal(restored.program, "Synthetic Program");
  assert.equal(restored.courses[0].year, 3);
  assert.equal(restored.courses[0].term, 2);
  assert.equal(restored.courses[0].originalYear, 1);
  assert.equal(restored.courses[0].originalTerm, 3);
  assert.equal(restored.courses[0].status, "Failed");
  assert.equal(restored.courses[0].isPinned, true);
  assert.deepEqual(restored.courses[1].prerequisiteGroups, [["A", "C"]]);
});

test("saved plan reader rejects unknown format versions", () => {
  assert.throws(() => parsePlanFile({ format: "pathwise-plan", formatVersion: 99 }), /unsupported format version/);
});
