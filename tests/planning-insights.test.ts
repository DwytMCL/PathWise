import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCurriculum } from "../lib/curriculum";
import { previewMove, explainPriority } from "../lib/planning-insights";

const options = { startTerm: 1, maxUnits: 18, assumeCurrentPass: true };
const curriculum = () => normalizeCurriculum({ courses: [
  { code: "A", year: 1, term: 1, creditUnits: 3 },
  { code: "B", year: 1, term: 2, creditUnits: 3, prerequisites: ["A"] },
  { code: "C", year: 1, term: 3, creditUnits: 3, prerequisites: ["B"] },
] });

test("move previews report actual dependent dates and finish without changing the source", () => {
  const input = curriculum().courses;
  const preview = previewMove(input, "A", 4, options);
  assert.equal(preview.before.finish, 3);
  assert.equal(preview.after.finish, 6);
  assert.equal(preview.delta, 3);
  assert.deepEqual(preview.changed.map(c => [c.code, c.before, c.after]), [["A", 1, 4], ["B", 2, 5], ["C", 3, 6]]);
  assert.equal(input[0].year, 1);
  assert.equal(input[0].isPinned, undefined);
});

test("moves preview the actual placement even when the course has no future assignment", () => {
  for (const status of ["Taken", "Exempted", "InCurrentLoad"] as const) {
    const input = normalizeCurriculum({ courses: [{ code: "A", year: 1, term: 1, creditUnits: 3, status }] }).courses;
    const preview = previewMove(input, "A", 4, options);
    assert.deepEqual(preview.placement, { before: 1, after: 4 });
    assert.equal(input[0].year, 1);
  }
});

test("an invalid move does not claim a complete finish and keeps the original plan intact", () => {
  const input = curriculum().courses;
  const preview = previewMove(input, "B", 1, options);
  assert.equal(preview.after.finish, null);
  assert.equal(preview.delta, null);
  assert.equal(preview.offeringConflict, true);
  assert.ok(preview.after.unresolved.some(c => c.code === "B"));
  assert.equal(input[1].term, 2);
  assert.throws(() => previewMove(input, "B", 0, options), /valid/);
});

test("priority explanations calculate the next offering and the consequence of deferral", () => {
  const explanation = explainPriority(curriculum().courses, "A", options);
  assert.deepEqual(explanation.connected.map(c => c.code), ["B", "C"]);
  assert.equal(explanation.scheduled, 1);
  assert.equal(explanation.nextOffering, 4);
  assert.equal(explanation.delta, 3);
});
