/**
 * Core client-side parser function.
 * Designed to execute directly in the active tab context of Curriculum.aspx
 * or on any DOM document containing #coreList.
 */
function parseCurriculumFromDOM(doc = document) {
  // 1. Metadata Extraction
  let program = "";
  let yearLevel = 0;
  let curriculumYear = 0;
  let specialization = "";

  const contentBody = doc.getElementById("contentBody");
  if (contentBody) {
    const paragraphs = contentBody.querySelectorAll("p");
    for (const p of paragraphs) {
      if (p.textContent.includes("Program:")) {
        const spans = p.querySelectorAll("span");
        if (spans.length >= 3) {
          program = spans[0].textContent.trim();
          yearLevel = parseInt(spans[1].textContent.trim(), 10) || 0;
          curriculumYear = parseInt(spans[2].textContent.trim(), 10) || 0;
        }
        if (spans.length >= 4) {
          specialization = spans[3].textContent.trim();
        }
        break;
      }
    }
  }

  // 2. Units Summary Extraction
  const units = { required: 0, credited: 0, passed: 0, left: 0 };
  const fieldset = doc.querySelector("fieldset");
  if (fieldset) {
    const listItems = fieldset.querySelectorAll("li");
    listItems.forEach(li => {
      const labelTag = li.querySelector("label");
      const valTag = li.querySelector("span.boldContent");
      if (labelTag && valTag) {
        const key = labelTag.textContent.replace(/[:\s]/g, "").toLowerCase();
        const val = parseInt(valTag.textContent.trim(), 10);
        if (!isNaN(val) && units.hasOwnProperty(key)) {
          units[key] = val;
        }
      }
    });
  }

  // 3. Helper Parsers
  const parseHours = (text) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === "-") return 0.0;
    const num = parseFloat(trimmed);
    return isNaN(num) ? 0.0 : num;
  };

  const parseUnits = (text) => {
    const trimmed = text.trim();
    const isNonAcademic = trimmed.startsWith("(") && trimmed.endsWith(")");
    const cleaned = trimmed.replace(/[()]/g, "").trim();
    let num = parseFloat(cleaned);
    if (isNaN(num)) num = 0;
    return { creditUnits: num, isNonAcademic };
  };

  const STANDING_RE = /\b(?:\d+(?:st|nd|rd|th)?\s+year(?:\s+standing)?|(?:first|second|third|fourth|fifth)\s+year(?:\s+standing)?|(?:freshman|sophomore|junior|senior|graduating|regular)(?:\s+standing)?|(?:consent|permission)\s+of\s+instructor|(?:dept|department)\s+approval|none|n\/a|n\.a\.|nil|tba)\b/gi;
  const STOP_WORDS = new Set([
    "and", "or", "&", "with", "grade", "of", "better",
    "consent", "permission", "dept", "department", "instructor",
    "standing", "year", "only", "simultaneously",
    "none", "na", "n/a", "nil", "tba", "-",
    "1st", "2nd", "3rd", "4th", "5th"
  ]);

  const parseRequisites = (text) => {
    if (!text) return [];
    const str = Array.isArray(text) ? text.join(",") : String(text);
    if (!str.trim()) return [];
    const cleanedText = str.replace(STANDING_RE, " ");
    const tokens = cleanedText.split(/[\s,;/]+/);
    const results = [];
    const seen = new Set();
    for (const tok of tokens) {
      const cleaned = tok.replace(/^[^\w]+|[^\w]+$/g, "");
      if (!cleaned) continue;
      const lower = cleaned.toLowerCase();
      if (STOP_WORDS.has(lower) || /^\d+(?:st|nd|rd|th)$/i.test(lower)) continue;
      if (!seen.has(lower)) {
        seen.add(lower);
        results.push(cleaned);
      }
    }
    return results;
  };

  const getStatus = (tr) => {
    const classList = tr.classList;
    if (classList.contains("bgColorTaken")) return "Taken";
    if (classList.contains("bgColorInCurrentLoad")) return "InCurrentLoad";
    if (classList.contains("bgColorIncomplete")) return "Incomplete";
    if (classList.contains("bgColorExempted")) return "Exempted";
    if (classList.contains("bgColorNotYetTaken")) return "NotYetTaken";
    return "NotYetTaken";
  };

  // 4. Courses Extraction
  const courses = [];
  const coreList = doc.getElementById("coreList");
  if (!coreList) {
    return { error: "Element #coreList not found. Ensure you are on the Curriculum page." };
  }

  const yearDivs = coreList.querySelectorAll(":scope > div[id]");
  yearDivs.forEach(yearDiv => {
    const yearId = parseInt(yearDiv.id, 10);
    if (isNaN(yearId)) return; // Skip non-numeric containers (e.g. specializationList)

    const tables = yearDiv.querySelectorAll("table.tableStyle2");
    tables.forEach(table => {
      let currentYear = yearId;
      let currentTerm = null;

      const rows = table.querySelectorAll("tbody > tr, :scope > tr");
      rows.forEach(tr => {
        if (tr.classList.contains("title") || tr.classList.contains("special")) return;

        const cells = tr.querySelectorAll("td");
        if (cells.length < 10) return;

        // Year and Term are sparse (only present on first row of term)
        const yrText = cells[0].textContent.trim();
        const termText = cells[1].textContent.trim();
        if (yrText) {
          const parsedYr = parseInt(yrText, 10);
          if (!isNaN(parsedYr)) currentYear = parsedYr;
        }
        if (termText) {
          const parsedTerm = parseInt(termText, 10);
          if (!isNaN(parsedTerm)) currentTerm = parsedTerm;
        }

        const code = cells[2].textContent.trim();
        if (!code) return;

        const title = cells[3].textContent.trim();
        const lecHrs = parseHours(cells[4].textContent);
        const labHrs = parseHours(cells[5].textContent);
        const { creditUnits, isNonAcademic } = parseUnits(cells[6].textContent);
        const prerequisites = parseRequisites(cells[7].textContent);
        const corequisites = parseRequisites(cells[8].textContent);
        const status = getStatus(tr);

        let description = "";
        if (cells.length > 10) {
          description = cells[10].textContent.trim();
        }

        courses.push({
          code,
          title,
          year: currentYear,
          term: currentTerm,
          lecHrs,
          labHrs,
          creditUnits,
          isNonAcademic,
          prerequisites,
          corequisites,
          status,
          description
        });
      });
    });
  });

  return {
    program,
    curriculumYear,
    yearLevel,
    specialization,
    units,
    courses
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseCurriculumFromDOM };
}
