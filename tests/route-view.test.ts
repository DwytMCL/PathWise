import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import EarliestPath from "../components/EarliestPath";
import { normalizeCurriculum } from "../lib/curriculum";
import { useCurriculumStore } from "../lib/store";

test("a manually moved course is visible in its destination timeline term", () => {
  const store = useCurriculumStore.getState();
  store.load(normalizeCurriculum({ courses: [
    { code: "TEST-PRAC", title: "Practice Placement", year: 4, term: 2, creditUnits: 3 },
    { code: "TEST301", title: "Final Project", year: 4, term: 3, creditUnits: 3 },
  ] }));
  try {
    store.move("TEST-PRAC", 5, 1);
    const html = renderToStaticMarkup(createElement(EarliestPath, {
      courses: useCurriculumStore.getState().curriculum!.courses, yearLevel: 4,
      onApply() {}, onSelect() {}, onTrace() {}, onBoard() {},
    }));
    const destination = [...html.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)]
      .find(([, , content]) => content.includes("Practice Placement"));
    assert.ok(destination, "The moved course must remain in the timeline.");
    assert.match(destination[2], /Year 5 · Term 1/);
    assert.match(destination[1], /\bopen(?:\s|=|$)/, "The moved course's term must be expanded.");
  } finally {
    store.clear();
  }
});

test("the route view with unresolved requirements never presents a finish or apply action", () => {
  const curriculum = normalizeCurriculum({ courses: [
    { code: "FINAL301", title: "Final Project", year: 3, term: 2, creditUnits: 3, prerequisites: "MISSING201" },
  ] });
  const html = renderToStaticMarkup(createElement(EarliestPath, {
    courses: curriculum.courses, yearLevel: 3,
    onApply() {}, onSelect() {}, onTrace() {}, onBoard() {},
  }));
  assert.match(html, /1 course to review/);
  assert.match(html, /Missing from file: MISSING201/);
  assert.doesNotMatch(html, /PROJECTED FINISH|Earliest finish under these assumptions|Use this plan/);
});

test("a completed curriculum has no suggested terms or artificial future finish in the route view", () => {
  const curriculum = normalizeCurriculum({ courses: [
    { code: "DONE101", title: "Completed Foundations", year: 1, term: 1, creditUnits: 3, status: "Taken" },
  ] });
  const html = renderToStaticMarkup(createElement(EarliestPath, {
    courses: curriculum.courses, yearLevel: 2,
    onApply() {}, onSelect() {}, onTrace() {}, onBoard() {},
  }));
  assert.match(html, /Nothing left to schedule/);
  assert.doesNotMatch(html, /PROJECTED FINISH|Choose a suggested term|Use this plan/);
});
