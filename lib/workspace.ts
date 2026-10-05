import { normalizeCurriculum, type Curriculum } from "./curriculum";
import { defaultStart, type PlanOptions } from "./planner";

export type PlanSnapshot = { curriculum: Curriculum; options: PlanOptions };
export type Scenario = PlanSnapshot & { id: string; name: string; savedAt: string };
export type PlanningWorkspace = PlanSnapshot & { scenarios: Scenario[] };
export const MAX_SCENARIOS = 12;

function catalog(curriculum: Curriculum) {
  return JSON.stringify({ ...curriculum, courses: [...curriculum.courses].sort((a, b) => a.code.localeCompare(b.code)).map(course => ({
    ...course, year: undefined, term: undefined, status: undefined, isPinned: undefined, offeredTerms: undefined,
  })) });
}

export const defaultOptions = (curriculum: Curriculum): PlanOptions => ({
  startTerm: defaultStart(curriculum.courses, curriculum.yearLevel), maxUnits: 18, assumeCurrentPass: true,
});

export function normalizeOptions(input: unknown, curriculum: Curriculum): PlanOptions {
  if (input === undefined) return defaultOptions(curriculum);
  if (!input || typeof input !== "object") throw new Error("The saved route settings could not be read.");
  const options = input as Record<string, unknown>;
  if (!Number.isInteger(options.startTerm) || Number(options.startTerm) < 1 || Number(options.startTerm) > 300 ||
      typeof options.maxUnits !== "number" || !Number.isFinite(options.maxUnits) || options.maxUnits < 1 || options.maxUnits > 60 ||
      typeof options.assumeCurrentPass !== "boolean") {
    throw new Error("Choose a valid starting term and a unit limit from 1–60.");
  }
  return { startTerm: options.startTerm as number, maxUnits: options.maxUnits, assumeCurrentPass: options.assumeCurrentPass };
}

export function normalizeScenarios(input: unknown, curriculum: Curriculum): Scenario[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > MAX_SCENARIOS) throw new Error(`A plan can contain up to ${MAX_SCENARIOS} scenarios.`);
  const ids = new Set<string>();
  const expectedCatalog = catalog(curriculum);
  return input.map(value => {
    if (!value || typeof value !== "object") throw new Error("A saved scenario could not be read.");
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id || row.id.length > 100 || ids.has(row.id) ||
        typeof row.name !== "string" || !row.name.trim() || row.name.trim().length > 60 ||
        typeof row.savedAt !== "string" || !Number.isFinite(Date.parse(row.savedAt))) {
      throw new Error("A saved scenario has an invalid name, date or identifier.");
    }
    ids.add(row.id);
    const snapshot = normalizeCurriculum(row.curriculum);
    if (catalog(snapshot) !== expectedCatalog) {
      throw new Error("A saved scenario does not match this curriculum.");
    }
    return { id: row.id, name: row.name.trim(), savedAt: row.savedAt, curriculum: snapshot, options: normalizeOptions(row.options, snapshot) };
  });
}
