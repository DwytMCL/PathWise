export const statuses = ["Taken", "InCurrentLoad", "NotYetTaken", "Incomplete", "Failed", "Dropped", "Exempted"] as const;
export type Status = (typeof statuses)[number];

export type Course = {
  code: string;
  title: string;
  year: number;
  term: number;
  originalYear: number;
  originalTerm: number;
  creditUnits: number;
  lecHrs: number;
  labHrs: number;
  isNonAcademic: boolean;
  prerequisites: string[];
  corequisites: string[];
  prerequisiteGroups: string[][];
  corequisiteGroups: string[][];
  requirementWarnings: string[];
  status: Status;
  description: string;
  isPinned?: boolean;
};

export type Curriculum = {
  program: string;
  curriculumYear: number;
  yearLevel: number;
  specialization: string;
  units: { required: number; credited: number; passed: number; left: number };
  courses: Course[];
};

const statusClasses: Record<string, Status> = {
  bgColorTaken: "Taken",
  bgColorInCurrentLoad: "InCurrentLoad",
  bgColorIncomplete: "Incomplete",
  bgColorExempted: "Exempted",
};

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const STANDING_RE = /\b(?:\d+(?:st|nd|rd|th)?\s+year(?:\s+standing)?|(?:first|second|third|fourth|fifth)\s+year(?:\s+standing)?|(?:freshman|sophomore|junior|senior|graduating|regular)(?:\s+standing)?|(?:consent|permission)\s+of\s+instructor|(?:dept|department)\s+approval|none|n\/a|n\.a\.|nil|tba)\b/gi;
const STOP_WORDS = new Set([
  "and", "or", "&", "with", "grade", "of", "better",
  "consent", "permission", "dept", "department", "instructor",
  "standing", "year", "only", "simultaneously",
  "none", "na", "n/a", "nil", "tba", "-",
  "1st", "2nd", "3rd", "4th", "5th",
]);

function parseRequirements(value: unknown, knownCodes: string[]) {
  if (value == null || value === "") return { groups: [] as string[][], warnings: [] as string[] };
  const warnings: string[] = [];
  const groups: string[][] = [];
  const known = (text: string) => knownCodes.find(code => code.toLowerCase() === text.toLowerCase()) ?? text;
  const addGroup = (parts: string[]) => {
    const alternatives = [...new Set(parts.map(part => known(part.trim())).filter(Boolean))];
    if (alternatives.length) groups.push(alternatives);
  };
  const parseClause = (clause: string, allowUnknown = false) => {
    const text = clause.replace(STANDING_RE, " ").trim();
    if (!text || /^(?:none|n\/?a|nil|-|tba)$/i.test(text)) return;
    const alternatives: string[] = [];
    for (const token of text.split(/\s*(?:\bor\b|\/)\s*/i)) {
      const cleaned = token.replace(/^[^\w]+|[^\w-]+$/g, "");
      if (!cleaned || STOP_WORDS.has(cleaned.toLowerCase())) continue;
      const matched = knownCodes.find(code => code.toLowerCase() === cleaned.toLowerCase());
      if (matched) alternatives.push(matched);
      else if (allowUnknown || /\d/.test(cleaned)) alternatives.push(cleaned);
      else warnings.push(`Could not read requirement “${token.trim()}”.`);
    }
    addGroup(alternatives);
  };
  if (Array.isArray(value) && value.every(Array.isArray)) {
    for (const group of value as unknown[][]) addGroup(group.map(String));
  } else if (Array.isArray(value)) {
    for (const item of value) parseClause(String(item ?? ""), true);
  } else {
    const text = String(value).replace(STANDING_RE, " ");
    for (const clause of text.split(/\s*(?:,|;|\band\b|&)\s*/i)) parseClause(clause);
  }
  const unique = groups.map(group => [...new Set(group)]);
  return { groups: unique, warnings: [...new Set(warnings)] };
}

const allCodes = (groups: string[][]) => [...new Set(groups.flat())];
export const formatRequirements = (groups: string[][], fallback: string[]) => (groups ?? fallback.map(code => [code])).map(group => group.join(" or ")).join(" and ");

export function normalizeCurriculum(input: unknown): Curriculum {
  if (!input || typeof input !== "object") throw new Error("This file does not contain a curriculum object.");
  const source = input as Record<string, unknown>;
  if (!Array.isArray(source.courses) || !source.courses.length) throw new Error("No courses were found in this file.");
  const rows = source.courses as Record<string, unknown>[];
  const codes = rows.map((row) => String(row.code ?? "").trim()).filter(Boolean);
  if (new Set(codes).size !== rows.length) throw new Error("Course codes must be present and unique.");
  const courses = rows.map((row): Course => {
    const year = num(row.year), term = num(row.term);
    if (!Number.isInteger(year) || year < 1 || year > 100 || !Number.isInteger(term) || term < 1 || term > 3) {
      throw new Error(`Invalid year or term for ${row.code ?? "a course"}.`);
    }
    if (row.creditUnits != null && (!Number.isFinite(Number(row.creditUnits)) || Number(row.creditUnits) < 0)) {
      throw new Error(`Invalid credit units for ${row.code}.`);
    }
    const status = statuses.includes(row.status as Status) ? row.status as Status : "NotYetTaken";
    const prerequisiteResult = parseRequirements(row.prerequisiteGroups ?? row.prerequisites, codes);
    const corequisiteResult = parseRequirements(row.corequisiteGroups ?? row.corequisites, codes);
    const originalYear = num(row.originalYear, year), originalTerm = num(row.originalTerm, term);
    if (!Number.isInteger(originalYear) || originalYear < 1 || originalYear > 100 || !Number.isInteger(originalTerm) || originalTerm < 1 || originalTerm > 3) {
      throw new Error(`Invalid original offering for ${row.code}.`);
    }
    return {
      code: String(row.code).trim(), title: String(row.title ?? row.code).trim(), year, term,
      originalYear, originalTerm, creditUnits: num(row.creditUnits),
      lecHrs: num(row.lecHrs), labHrs: num(row.labHrs), isNonAcademic: Boolean(row.isNonAcademic),
      prerequisites: allCodes(prerequisiteResult.groups), corequisites: allCodes(corequisiteResult.groups),
      prerequisiteGroups: prerequisiteResult.groups, corequisiteGroups: corequisiteResult.groups,
      requirementWarnings: [...prerequisiteResult.warnings, ...corequisiteResult.warnings].map(message => `${String(row.code)}: ${message}`),
      status, description: String(row.description ?? "").trim(),
      isPinned: row.isPinned === true || undefined,
    };
  });
  const rawUnits = (source.units ?? {}) as Record<string, unknown>;
  return {
    program: String(source.program ?? "Curriculum").trim() || "Curriculum",
    curriculumYear: num(source.curriculumYear), yearLevel: num(source.yearLevel),
    specialization: String(source.specialization ?? "").trim(),
    units: { required: num(rawUnits.required), credited: num(rawUnits.credited), passed: num(rawUnits.passed), left: num(rawUnits.left) },
    courses,
  };
}

export function parseCurriculumHtml(html: string): Curriculum {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const core = doc.querySelector("#coreList");
  if (!core) throw new Error("No #coreList table found. Save the OneMCL curriculum page and try again.");
  const meta = [...doc.querySelectorAll("#contentBody p")].find((p) => p.textContent?.includes("Program:"));
  const spans = meta ? [...meta.querySelectorAll("span")].map((s) => s.textContent?.trim() ?? "") : [];
  const units = { required: 0, credited: 0, passed: 0, left: 0 };
  doc.querySelectorAll("fieldset li").forEach((li) => {
    const key = li.querySelector("label")?.textContent?.replace(/[:\s]/g, "").toLowerCase();
    if (key && key in units) units[key as keyof typeof units] = num(li.querySelector("span.boldContent")?.textContent);
  });
  const courses: Record<string, unknown>[] = [];
  core.querySelectorAll(":scope > div[id]").forEach((section) => {
    const sectionYear = Number(section.id);
    if (!Number.isInteger(sectionYear)) return;
    section.querySelectorAll("table.tableStyle2").forEach((table) => {
      let year = sectionYear, term = 0;
      table.querySelectorAll("tr").forEach((row) => {
        if (row.classList.contains("title") || row.classList.contains("special")) return;
        const cells = [...row.children].filter((child) => child.tagName === "TD");
        if (cells.length < 10) return;
        const val = (index: number) => cells[index]?.textContent?.trim() ?? "";
        year = num(val(0), year) || year;
        term = num(val(1), term) || term;
        if (!val(2)) return;
        const unitsText = val(6);
        const status = Object.entries(statusClasses).find(([name]) => row.classList.contains(name))?.[1] ?? "NotYetTaken";
        courses.push({ code: val(2), title: val(3), year, term, lecHrs: num(val(4)), labHrs: num(val(5)),
          creditUnits: num(unitsText.replace(/[()]/g, "")), isNonAcademic: /^\(.*\)$/.test(unitsText),
          prerequisites: val(7), corequisites: val(8), status, description: val(10) });
      });
    });
  });
  return normalizeCurriculum({ program: spans[0], yearLevel: spans[1], curriculumYear: spans[2], specialization: spans[3], units, courses });
}

export const termIndex = (course: Pick<Course, "year" | "term">) => (course.year - 1) * 3 + course.term;

export function analyze(courses: Course[]) {
  const byCode = new Map(courses.map((course) => [course.code, course]));
  const blocked = new Map<string, string[]>();
  const missing = new Set<string>();
  const failed = new Set<Status>(["Incomplete", "Failed", "Dropped"]);
  // A bounded fixed point handles prerequisite chains without relying on input order.
  for (let pass = 0; pass < courses.length; pass++) {
    let changed = false;
    for (const course of courses) {
      if (course.status === "Taken" || course.status === "Exempted") continue;
      const reasons: string[] = [];
      const prerequisiteGroups = course.prerequisiteGroups ?? course.prerequisites.map(code => [code]);
      const corequisiteGroups = course.corequisiteGroups ?? course.corequisites.map(code => [code]);
      for (const group of [...prerequisiteGroups, ...corequisiteGroups]) group.filter(code => !byCode.has(code)).forEach(code => missing.add(code));
      for (const group of prerequisiteGroups) {
        const satisfied = group.some(code => {
          const item = byCode.get(code);
          return item && (item.status === "Taken" || item.status === "Exempted" ||
            (!failed.has(item.status) && !blocked.has(code) && termIndex(item) < termIndex(course)));
        });
        if (!satisfied) reasons.push(...group);
      }
      for (const group of corequisiteGroups) {
        const satisfied = group.some(code => {
          const item = byCode.get(code);
          return item && (item.status === "Taken" || item.status === "Exempted" ||
            (!failed.has(item.status) && !blocked.has(code) && termIndex(item) <= termIndex(course)));
        });
        if (!satisfied) reasons.push(...group);
      }
      if (reasons.length && JSON.stringify(blocked.get(course.code)) !== JSON.stringify(reasons)) {
        blocked.set(course.code, reasons); changed = true;
      }
    }
    if (!changed) break;
  }
  const loads = new Map<number, number>();
  for (const course of courses) loads.set(termIndex(course), (loads.get(termIndex(course)) ?? 0) + course.creditUnits);
  const availabilityRisks = courses.flatMap((course) => {
    if (!blocked.has(course.code)) return [];
    const latestPrerequisite = Math.max(0, ...(course.prerequisiteGroups ?? course.prerequisites.map(code => [code])).map(group => {
      const earliestOption = Math.min(...group.map(code => {
      const prerequisite = byCode.get(code);
      return prerequisite && !failed.has(prerequisite.status) && prerequisite.status !== "Taken" && prerequisite.status !== "Exempted" ? termIndex(prerequisite) : Infinity;
      }));
      return Number.isFinite(earliestOption) ? earliestOption : 0;
    }));
    if (!latestPrerequisite) return [];
    const original = (course.originalYear - 1) * 3 + course.originalTerm;
    let next = original;
    while (next <= latestPrerequisite) next += 3;
    return next > original ? [{ code: course.code, terms: next - original, nextYear: Math.floor((next - 1) / 3) + 1 }] : [];
  });
  const offeringConflicts = courses.filter(c => c.status !== "Taken" && c.status !== "Exempted" && c.term !== c.originalTerm);
  return { blocked, missing: [...missing], loads, availabilityRisks, offeringConflicts };
}
