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
