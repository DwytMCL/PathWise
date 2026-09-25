import { normalizeCurriculum, type Curriculum } from "./curriculum";

export const PLAN_FILE_FORMAT = "pathwise-plan";
export const PLAN_FILE_VERSION = 1;

export function serializePlanFile(curriculum: Curriculum) {
  return JSON.stringify({
    format: PLAN_FILE_FORMAT,
    formatVersion: PLAN_FILE_VERSION,
    savedAt: new Date().toISOString(),
    curriculum,
  }, null, 2);
}

export function parsePlanFile(input: unknown): Curriculum {
  if (!input || typeof input !== "object") throw new Error("This file does not contain a PathWise plan.");
  const file = input as Record<string, unknown>;
  if (file.format !== PLAN_FILE_FORMAT) throw new Error("This is not a saved PathWise plan.");
  if (file.formatVersion !== PLAN_FILE_VERSION) throw new Error(`This plan uses an unsupported format version (${String(file.formatVersion)}).`);
  return normalizeCurriculum(file.curriculum);
}

export function isPlanFile(input: unknown): boolean {
  return !!input && typeof input === "object" && (input as Record<string, unknown>).format === PLAN_FILE_FORMAT;
}
