import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCurriculum } from "../lib/curriculum";
import { useCurriculumStore } from "../lib/store";

test("a named scenario restores full progress, offerings, settings and schedule with Undo", () => {
  const store = useCurriculumStore.getState();
  store.load(normalizeCurriculum({ program: "Example", courses: [
    { code: "A", year: 1, term: 3, creditUnits: 3 },
    { code: "B", year: 1, term: 2, creditUnits: 3, prerequisites: ["A"] },
  ] }));
  store.setOfferings("A", [1, 3]);
  store.setOptions({ startTerm: 1, maxUnits: 12, assumeCurrentPass: false });
  store.saveScenario("My route");
  const scenario = useCurriculumStore.getState().scenarios[0];
  assert.equal(scenario.curriculum.courses[0].term, 1);
  assert.equal(scenario.curriculum.courses[1].term, 2);
  store.setStatus("A", "Failed");
  store.setOfferings("A", [2]);
  store.setOptions({ startTerm: 4, maxUnits: 18, assumeCurrentPass: true });
  const previous = useCurriculumStore.getState();
  assert.equal(scenario.curriculum.courses[0].status, "NotYetTaken");
  assert.deepEqual(scenario.curriculum.courses[0].offeredTerms, [1, 3]);
  store.restoreScenario(scenario.id);
  assert.equal(useCurriculumStore.getState().curriculum!.courses[0].status, "NotYetTaken");
  assert.deepEqual(useCurriculumStore.getState().curriculum!.courses[0].offeredTerms, [1, 3]);
  assert.equal(useCurriculumStore.getState().options!.maxUnits, 12);
  store.undo();
  assert.deepEqual(useCurriculumStore.getState().curriculum, previous.curriculum);
  assert.deepEqual(useCurriculumStore.getState().options, previous.options);
  store.clear();
});

test("custom offerings and scenario management can be undone without losing imported availability", () => {
  const store = useCurriculumStore.getState();
  store.load(normalizeCurriculum({ courses: [{ code: "A", year: 1, term: 3 }] }));
  store.setOfferings("A", [3, 1, 1]);
  assert.deepEqual(useCurriculumStore.getState().curriculum!.courses[0].offeredTerms, [1, 3]);
  assert.equal(useCurriculumStore.getState().curriculum!.courses[0].originalTerm, 3);
  store.undo();
  assert.equal(useCurriculumStore.getState().curriculum!.courses[0].offeredTerms, undefined);
  store.saveScenario("Original");
  const id = useCurriculumStore.getState().scenarios[0].id;
  store.renameScenario(id, "Renamed"); store.deleteScenario(id); store.undo();
  assert.equal(useCurriculumStore.getState().scenarios[0].name, "Renamed");
  store.undo();
  assert.equal(useCurriculumStore.getState().scenarios[0].name, "Original");
  assert.throws(() => store.setOfferings("A", []), /offering/i);
  store.clear();
});
