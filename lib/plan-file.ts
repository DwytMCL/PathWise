import { normalizeCurriculum, type Curriculum } from "./curriculum";
import { normalizeOptions, normalizeScenarios, type PlanningWorkspace } from "./workspace";

export const PLAN_FILE_FORMAT = "pathwise-plan";
export const PLAN_FILE_VERSION = 2;

export function serializePlanFile(curriculum: Curriculum, planning?: Pick<PlanningWorkspace, "options" | "scenarios">) {
  return JSON.stringify({
    format: PLAN_FILE_FORMAT,
    formatVersion: PLAN_FILE_VERSION,
    savedAt: new Date().toISOString(),
    curriculum,
    options: normalizeOptions(planning?.options, curriculum),
    scenarios: normalizeScenarios(planning?.scenarios, curriculum),
  }, null, 2);
}

export function parsePlanFile(input: unknown): Curriculum {
  return parseWorkspaceFile(input).curriculum;
}

export function parseWorkspaceFile(input: unknown): PlanningWorkspace {
  if (!input || typeof input !== "object") throw new Error("This file does not contain a PathWise plan.");
  const file = input as Record<string, unknown>;
  if (file.format !== PLAN_FILE_FORMAT) throw new Error("This is not a saved PathWise plan.");
  if (file.formatVersion !== 1 && file.formatVersion !== PLAN_FILE_VERSION) throw new Error(`This plan uses an unsupported format version (${String(file.formatVersion)}).`);
  const curriculum = normalizeCurriculum(file.curriculum);
  return { curriculum, options: normalizeOptions(file.options, curriculum), scenarios: normalizeScenarios(file.scenarios, curriculum) };
}

export function isPlanFile(input: unknown): boolean {
  return !!input && typeof input === "object" && (input as Record<string, unknown>).format === PLAN_FILE_FORMAT;
}
