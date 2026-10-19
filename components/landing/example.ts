// Fictional curriculum shown on the landing page. It is never the student's workspace,
// and every figure below agrees with the others: 66 units left from Year 3 · Term 1.

export const START_TERM = "Year 3 · Term 1";
export const UNITS_LEFT = 66;

export const terms = ["Y3 · T1", "Y3 · T2", "Y3 · T3", "Y4 · T1"] as const;

export type ChainCourse = { code: string; title: string; term: number; row: number };

// Columns are planned terms; rows only spread the nodes vertically.
export const chainCourses: ChainCourse[] = [
  { code: "CS201", title: "Data structures", term: 0, row: 0 },
  { code: "MA202", title: "Discrete mathematics", term: 0, row: 2 },
  { code: "CS301", title: "Algorithms", term: 1, row: 0 },
  { code: "CS305", title: "Databases", term: 1, row: 2 },
  { code: "CS350", title: "Software studio", term: 2, row: 1 },
  { code: "CS499", title: "Capstone project", term: 3, row: 1 },
];

// Edges in drawing order: what Data structures opens, then where it leads.
export const chainLinks: [string, string][] = [
  ["CS201", "CS301"], ["CS201", "CS305"], ["MA202", "CS301"],
  ["CS301", "CS350"], ["CS305", "CS350"], ["CS350", "CS499"],
];

export type PaceOption = { units: number; label: string; finish: string; terms: number[]; note: string };

// Each load spreads the same 66 units; above 18 the prerequisite chain, not the load, sets the finish.
export const paceOptions: PaceOption[] = [
  { units: 12, label: "Lighter", finish: "Year 4 · Term 3", terms: [12, 12, 12, 12, 12, 6], note: "Six terms, with room for work or rest." },
  { units: 15, label: "Steady", finish: "Year 4 · Term 2", terms: [15, 15, 12, 12, 12], note: "One extra term, and no term above 15 units." },
  { units: 18, label: "Full", finish: "Year 4 · Term 1", terms: [18, 18, 15, 15], note: "The fastest finish this chain allows." },
  { units: 21, label: "Overload", finish: "Year 4 · Term 1", terms: [21, 18, 15, 12], note: "Same finish as 18. Here the prerequisite chain sets the pace, not the load." },
];

export const paceTermLabels = ["Y3 · T1", "Y3 · T2", "Y3 · T3", "Y4 · T1", "Y4 · T2", "Y4 · T3"];
