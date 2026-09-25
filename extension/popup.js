document.getElementById("exportBtn").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  const statsDiv = document.getElementById("stats");
  const btn = document.getElementById("exportBtn");

  statusDiv.style.display = "none";
  statusDiv.className = "";
  statsDiv.innerHTML = "";
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error("No active browser tab found.");
    }

    // Execute parser script on the active tab
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: runParserInPage
    });

    const data = result?.result;
    if (!data) {
      throw new Error("Failed to extract data from page.");
    }

    if (data.error) {
      throw new Error(data.error);
    }

    // Trigger JSON file download in browser
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `curriculum_${data.program || "export"}_${data.curriculumYear || new Date().getFullYear()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Show success & stats
    statusDiv.className = "success";
    statusDiv.textContent = `Successfully exported ${data.courses.length} courses!`;
    statusDiv.style.display = "block";

    statsDiv.innerHTML = `
      <div><strong>Program:</strong> <span>${data.program || "N/A"}</span></div>
      <div><strong>Curriculum Year:</strong> <span>${data.curriculumYear || "N/A"}</span></div>
      <div><strong>Required Units:</strong> <span>${data.units?.required ?? "N/A"}</span></div>
      <div><strong>Passed Units:</strong> <span>${data.units?.passed ?? "N/A"}</span></div>
    `;
  } catch (err) {
    statusDiv.className = "error";
    statusDiv.textContent = err.message || "An error occurred.";
    statusDiv.style.display = "block";
  } finally {
    btn.disabled = false;
  }
});

// Function executed directly inside the student portal page
function runParserInPage() {
  const doc = document;
  const coreList = doc.getElementById("coreList");
  if (!coreList) {
    return { error: "Could not find #coreList. Please make sure you are on the 'My Curriculum' page (Curriculum.aspx)." };
  }

  // 1. Program Metadata
  let program = "";
  let yearLevel = 0;
  let curriculumYear = 0;
  let specialization = "";

  const contentBody = doc.getElementById("contentBody");
  if (contentBody) {
    for (const p of contentBody.querySelectorAll("p")) {
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

  // 2. Units Summary
  const units = { required: 0, credited: 0, passed: 0, left: 0 };
  const fieldset = doc.querySelector("fieldset");
  if (fieldset) {
    fieldset.querySelectorAll("li").forEach(li => {
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

  // 3. Helper Functions
  const parseHours = (text) => {
    const trimmed = text ? text.trim() : "";
    if (!trimmed || trimmed === "-") return 0.0;
    const num = parseFloat(trimmed);
    return isNaN(num) ? 0.0 : num;
  };

  const parseUnits = (text) => {
    const trimmed = text ? text.trim() : "";
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
  const yearDivs = coreList.querySelectorAll(":scope > div[id]");
  yearDivs.forEach(yearDiv => {
    const yearId = parseInt(yearDiv.id, 10);
    if (isNaN(yearId)) return;

    const tables = yearDiv.querySelectorAll("table.tableStyle2");
    tables.forEach(table => {
      let currentYear = yearId;
      let currentTerm = null;

      const rows = table.querySelectorAll("tbody > tr, :scope > tr");
      rows.forEach(tr => {
        if (tr.classList.contains("title") || tr.classList.contains("special")) return;

        const cells = tr.querySelectorAll("td");
        if (cells.length < 10) return;

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
