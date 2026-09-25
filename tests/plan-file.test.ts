import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCurriculum } from "../lib/curriculum";
import { parsePlanFile, serializePlanFile } from "../lib/plan-file";

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
