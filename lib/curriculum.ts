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

const requisiteCodes = (value: unknown, knownCodes: string[]): string[] => {
  if (value == null) return [];
  const text = Array.isArray(value) ? value.join(",") : String(value);
  if (!text.trim()) return [];
  const cleanedText = text.replace(STANDING_RE, " ");
  const tokens = cleanedText.split(/[\s,;/]+/);
  const results: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const cleaned = token.replace(/^[^\w]+|[^\w]+$/g, "");
    if (!cleaned) continue;
    const lower = cleaned.toLowerCase();
    if (STOP_WORDS.has(lower) || /^\d+(?:st|nd|rd|th)$/i.test(lower)) continue;

    const matched = knownCodes.find(code => code.toLowerCase() === lower) ?? cleaned;
    const key = matched.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      results.push(matched);
    }
  }

  return results;
};

export function normalizeCurriculum(input: unknown): Curriculum {
  if (!input || typeof input !== "object") throw new Error("This file does not contain a curriculum object.");
  const source = input as Record<string, unknown>;
  if (!Array.isArray(source.courses) || !source.courses.length) throw new Error("No courses were found in this file.");
  const rows = source.courses as Record<string, unknown>[];
  const codes = rows.map((row) => String(row.code ?? "").trim()).filter(Boolean);
  if (new Set(codes).size !== rows.length) throw new Error("Course codes must be present and unique.");
  const courses = rows.map((row): Course => {
    const year = num(row.year), term = num(row.term);
    if (!Number.isInteger(year) || year < 1 || year > 10 || !Number.isInteger(term) || term < 1 || term > 3) {
      throw new Error(`Invalid year or term for ${row.code ?? "a course"}.`);
    }
    if (row.creditUnits != null && (!Number.isFinite(Number(row.creditUnits)) || Number(row.creditUnits) < 0)) {
      throw new Error(`Invalid credit units for ${row.code}.`);
    }
    const status = statuses.includes(row.status as Status) ? row.status as Status : "NotYetTaken";
    return {
      code: String(row.code).trim(), title: String(row.title ?? row.code).trim(), year, term,
      originalYear: year, originalTerm: term, creditUnits: num(row.creditUnits),
      lecHrs: num(row.lecHrs), labHrs: num(row.labHrs), isNonAcademic: Boolean(row.isNonAcademic),
      prerequisites: requisiteCodes(row.prerequisites, codes), corequisites: requisiteCodes(row.corequisites, codes),
      status, description: String(row.description ?? "").trim(),
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
      const reasons = course.prerequisites.filter((code) => {
        const prerequisite = byCode.get(code);
        if (!prerequisite) { missing.add(code); return true; }
        return failed.has(prerequisite.status) || blocked.has(code) ||
          (prerequisite.status !== "Taken" && prerequisite.status !== "Exempted" && termIndex(prerequisite) >= termIndex(course));
      });
      for (const code of course.corequisites) {
        const corequisite = byCode.get(code);
        if (!corequisite) { missing.add(code); reasons.push(code); }
        else if (failed.has(corequisite.status) || blocked.has(code) ||
          (corequisite.status !== "Taken" && corequisite.status !== "Exempted" && termIndex(corequisite) > termIndex(course))) reasons.push(code);
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
    const latestPrerequisite = Math.max(0, ...course.prerequisites.map((code) => {
      const prerequisite = byCode.get(code);
      return prerequisite && !failed.has(prerequisite.status) && prerequisite.status !== "Taken" && prerequisite.status !== "Exempted" ? termIndex(prerequisite) : 0;
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
