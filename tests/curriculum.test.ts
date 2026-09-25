import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, normalizeCurriculum } from "../lib/curriculum";

test("a failed prerequisite blocks its downstream chain and term loads follow moves", () => {
  const curriculum = normalizeCurriculum({ courses: [
    { code: "A", year: 1, term: 1, creditUnits: 3, status: "Failed" },
    { code: "B", year: 1, term: 2, creditUnits: 3, status: "NotYetTaken", prerequisites: "A" },
    { code: "C", year: 1, term: 3, creditUnits: 3, status: "NotYetTaken", prerequisites: "B" },
  ] });
  const result = analyze(curriculum.courses);
  assert.deepEqual(result.blocked.get("B"), ["A"]);
  assert.deepEqual(result.blocked.get("C"), ["B"]);
  assert.equal(result.loads.get(2), 3);
  curriculum.courses[1].term = 3;
  assert.equal(analyze(curriculum.courses).loads.get(3), 6);
});

test("later prerequisites expose conditional annual offering risk", () => {
  const { courses } = normalizeCurriculum({ courses: [
    { code: "A", year: 1, term: 1, status: "NotYetTaken" },
    { code: "B", year: 1, term: 2, status: "NotYetTaken", prerequisites: "A" },
  ] });
  courses[0].term = 3;
  assert.deepEqual(analyze(courses).availabilityRisks, [{ code: "B", terms: 3, nextYear: 2 }]);
});

test("manual moves report unavailable terms, later corequisites, and missing requirements", () => {
  const { courses } = normalizeCurriculum({ courses: [
    { code: "LECT", year: 1, term: 1 },
    { code: "LAB", year: 1, term: 1, corequisites: ["LECT"] },
    { code: "NEXT", year: 1, term: 2, prerequisites: ["LECT", "OUTSIDE"] },
  ] });
  courses[0].term = 2;
  const result = analyze(courses);
  assert.deepEqual(result.blocked.get("LAB"), ["LECT"]);
  assert.ok(result.blocked.get("NEXT")?.includes("OUTSIDE"));
  assert.deepEqual(result.missing, ["OUTSIDE"]);
  assert.deepEqual(result.offeringConflicts.map(c => c.code), ["LECT"]);
});

test("requisite parsing filters stop words and standing phrases", () => {
  const { courses } = normalizeCurriculum({
    courses: [
      { code: "CS101", year: 1, term: 1 },
      { code: "CS102", year: 1, term: 1 },
      { code: "CS201", year: 2, term: 1, prerequisites: "CS101 or CS102" },
      { code: "CS301", year: 3, term: 1, prerequisites: "3rd Year Standing, CS201 and CS101" },
      { code: "CS401", year: 4, term: 1, prerequisites: "Graduating Standing; None" },
    ]
  });

  assert.deepEqual(courses.find(c => c.code === "CS201")?.prerequisites, ["CS101", "CS102"]);
  assert.deepEqual(courses.find(c => c.code === "CS201")?.prerequisiteGroups, [["CS101", "CS102"]]);
  assert.deepEqual(courses.find(c => c.code === "CS301")?.prerequisiteGroups, [["CS201"], ["CS101"]]);
  assert.deepEqual(courses.find(c => c.code === "CS301")?.prerequisites, ["CS201", "CS101"]);
  assert.deepEqual(courses.find(c => c.code === "CS401")?.prerequisites, []);

  const analysis = analyze(courses);
  assert.deepEqual(analysis.missing, []);
});

test("unknown plain-language requirement fragments are surfaced for review", () => {
  const { courses } = normalizeCurriculum({ courses: [
    { code: "CS101", year: 1, term: 1 },
    { code: "NEXT", year: 1, term: 2, prerequisites: "CS101 and minimum GPA" },
  ] });
  assert.deepEqual(courses[1].prerequisiteGroups, [["CS101"]]);
  assert.ok(courses[1].requirementWarnings.some(message => message.includes("minimum")));
  assert.ok(courses[1].requirementWarnings.some(message => message.includes("GPA")));
});

test("requisite parsing handles edge values, mixed delimiters, and case canonicalization", () => {
  const { courses } = normalizeCurriculum({
    courses: [
      { code: "CS101", year: 1, term: 1 },
      { code: "CS102", year: 1, term: 1 },
      { code: "CS103", year: 1, term: 1 },
      { code: "CS104", year: 1, term: 1 },
      { code: "TEST1", year: 2, term: 1, prerequisites: "-" },
      { code: "TEST2", year: 2, term: 1, prerequisites: "N/A" },
      { code: "TEST3", year: 2, term: 1, prerequisites: "None" },
      { code: "TEST4", year: 2, term: 1, prerequisites: "" },
      { code: "TEST5", year: 2, term: 1, prerequisites: null },
      { code: "TEST6", year: 2, term: 1, prerequisites: "CS101; CS102/CS103, CS104" },
      { code: "TEST7", year: 2, term: 1, prerequisites: "cs101, CS101, CS101" },
      { code: "TEST8", year: 2, term: 1, prerequisites: ["3rd Year Standing", "CS101 or CS102"] },
    ]
  });

  assert.deepEqual(courses.find(c => c.code === "TEST1")?.prerequisites, []);
  assert.deepEqual(courses.find(c => c.code === "TEST2")?.prerequisites, []);
  assert.deepEqual(courses.find(c => c.code === "TEST3")?.prerequisites, []);
  assert.deepEqual(courses.find(c => c.code === "TEST4")?.prerequisites, []);
  assert.deepEqual(courses.find(c => c.code === "TEST5")?.prerequisites, []);
  assert.deepEqual(courses.find(c => c.code === "TEST6")?.prerequisites, ["CS101", "CS102", "CS103", "CS104"]);
  assert.deepEqual(courses.find(c => c.code === "TEST7")?.prerequisites, ["CS101"]);
  assert.deepEqual(courses.find(c => c.code === "TEST8")?.prerequisites, ["CS101", "CS102"]);

  const analysis = analyze(courses);
  assert.deepEqual(analysis.missing, []);
});

test("moving a course to year 5 term 1 flags off-term offering conflict", () => {
  const { courses } = normalizeCurriculum({
    courses: [
      { code: "CPE199R-1P", title: "CPE Practicum", year: 4, term: 2, creditUnits: 3 },
    ]
  });

  // Initially in Year 4 Term 2 (matches originalTerm: 2)
  let result = analyze(courses);
  assert.equal(result.offeringConflicts.length, 0);

  // Move to Year 5 Term 1 (term 1 != originalTerm 2)
  courses[0].year = 5;
  courses[0].term = 1;
  result = analyze(courses);
  assert.equal(result.offeringConflicts.length, 1);
  assert.equal(result.offeringConflicts[0].code, "CPE199R-1P");

  // Move to Year 5 Term 2 (term 2 == originalTerm 2)
  courses[0].year = 5;
  courses[0].term = 2;
  result = analyze(courses);
  assert.equal(result.offeringConflicts.length, 0);
});
