#!/usr/bin/env python3
"""
parseCurriculum.py — MMCL OnEMCL Curriculum HTML → JSON Parser

Parses saved HTML files from the MMCL portal (Curriculum.aspx) and converts
them into a structured JSON file for the PathWise graph simulator.

Usage:
    python parseCurriculum.py <input.html> [output.json]

If output path is omitted, writes curriculum.json to the same directory
as the input file.
"""

import sys
import os
import json
import re
from bs4 import BeautifulSoup


# ── Status mapping: <tr> CSS class → status string ─────────────────────────
STATUS_MAP = {
    "bgColorTaken":         "Taken",
    "bgColorInCurrentLoad": "InCurrentLoad",
    "bgColorIncomplete":    "Incomplete",
    "bgColorExempted":      "Exempted",
    "bgColorNotYetTaken":   "NotYetTaken",
}

# Row classes to skip (headers and total footers)
SKIP_CLASSES = {"title", "special"}


def parse_hours(text: str) -> float:
    """Parse lecture/lab hours. Treats '-' and empty strings as 0."""
    text = text.strip()
    if not text or text == "-":
        return 0.0
    return float(text)


def parse_units(text: str) -> tuple[float, bool]:
    """
    Parse credit units, stripping parentheses for non-academic courses.
    Returns (units, is_non_academic).
    """
    text = text.strip()
    is_non_academic = text.startswith("(") and text.endswith(")")
    cleaned = text.strip("() ")
    try:
        units = float(cleaned)
    except ValueError:
        units = 0.0
    # Return int if it's a whole number, else float
    if units == int(units):
        units = int(units)
    return units, is_non_academic


STANDING_RE = re.compile(
    r"\b(?:\d+(?:st|nd|rd|th)?\s+year(?:\s+standing)?|"
    r"(?:first|second|third|fourth|fifth)\s+year(?:\s+standing)?|"
    r"(?:freshman|sophomore|junior|senior|graduating|regular)(?:\s+standing)?|"
    r"(?:consent|permission)\s+of\s+instructor|"
    r"(?:dept|department)\s+approval|"
    r"none|n/a|n\.a\.|nil|tba)\b",
    re.IGNORECASE,
)

STOP_WORDS = {
    "and", "or", "&", "with", "grade", "of", "better",
    "consent", "permission", "dept", "department", "instructor",
    "standing", "year", "only", "simultaneously",
    "none", "na", "n/a", "nil", "tba", "-",
    "1st", "2nd", "3rd", "4th", "5th",
}


def parse_requisites(text: str) -> list[str]:
    """Parse requisite course codes, filtering stop words and standing requirements."""
    if not text or not str(text).strip():
        return []
    cleaned_text = STANDING_RE.sub(" ", str(text))
    tokens = re.split(r"[\s,;/]+", cleaned_text)
    results = []
    seen = set()
    for tok in tokens:
        cleaned = re.sub(r"^[^\w]+|[^\w]+$", "", tok)
        if not cleaned:
            continue
        lower = cleaned.lower()
        if lower in STOP_WORDS or re.match(r"^\d+(?:st|nd|rd|th)$", lower):
            continue
        if lower not in seen:
            seen.add(lower)
            results.append(cleaned)
    return results


def classify_row(tr) -> str:
    """Determine the status of a course row from its CSS classes."""
    classes = tr.get("class", [])
    for css_class, status in STATUS_MAP.items():
        if css_class in classes:
            return status
    return "NotYetTaken"


def should_skip_row(tr) -> bool:
    """Check if a row is a header or footer that should be skipped."""
    classes = set(tr.get("class", []))
    return bool(classes & SKIP_CLASSES)


def extract_metadata(soup: BeautifulSoup) -> dict:
    """
    Extract program metadata from the <p> containing 'Program:' and
    unit summary from the <fieldset>.
    """
    metadata = {
        "program": "",
        "curriculumYear": 0,
        "yearLevel": 0,
        "specialization": "",
    }

    # Find the <p> tag with program info (it contains "Program:" text)
    content_body = soup.find(id="contentBody")
    if not content_body:
        return metadata

    # The metadata <p> contains: "Program: <span>COE</span>Year Level: ..."
    for p_tag in content_body.find_all("p"):
        text = p_tag.get_text()
        if "Program:" in text:
            spans = p_tag.find_all("span")
            if len(spans) >= 3:
                metadata["program"] = spans[0].get_text(strip=True)
                try:
                    metadata["yearLevel"] = int(spans[1].get_text(strip=True))
                except ValueError:
                    pass
                try:
                    metadata["curriculumYear"] = int(spans[2].get_text(strip=True))
                except ValueError:
                    pass
            if len(spans) >= 4:
                metadata["specialization"] = spans[3].get_text(strip=True)
            break

    return metadata


def extract_units(soup: BeautifulSoup) -> dict:
    """Extract the unit summary from the <fieldset> block."""
    units = {"required": 0, "credited": 0, "passed": 0, "left": 0}

    fieldset = soup.find("fieldset")
    if not fieldset:
        return units

    for li in fieldset.find_all("li"):
        label_tag = li.find("label")
        value_tag = li.find("span", class_="boldContent")
        if not label_tag or not value_tag:
            continue

        # Clean label: "Required: " → "required"
        label = label_tag.get_text().strip().rstrip(":").strip().lower()
        try:
            value = int(value_tag.get_text(strip=True))
        except ValueError:
            continue

        if label in units:
            units[label] = value

    return units


def extract_courses(soup: BeautifulSoup) -> list[dict]:
    """
    Extract all courses from #coreList, iterating over year divs and
    term tables. Maintains year/term state across sparse rows.
    """
    courses = []

    core_list = soup.find(id="coreList")
    if not core_list:
        print("WARNING: #coreList container not found!", file=sys.stderr)
        return courses

    # Iterate over direct child divs with numeric IDs (year containers)
    for year_div in core_list.find_all("div", recursive=False):
        div_id = year_div.get("id", "")

        # Skip non-numeric containers (e.g., "specializationList")
        try:
            year_from_div = int(div_id)
        except ValueError:
            continue

        # Each table.tableStyle2 within this div is one term
        for table in year_div.find_all("table", class_="tableStyle2"):
            current_year = year_from_div
            current_term = None

            tbody = table.find("tbody") or table
            for tr in tbody.find_all("tr", recursive=False):
                # Skip header and footer rows
                if should_skip_row(tr):
                    continue

                cells = tr.find_all("td")
                if len(cells) < 10:
                    continue

                # ── Track Year/Term from first row of each term ──
                yr_text = cells[0].get_text(strip=True)
                term_text = cells[1].get_text(strip=True)

                if yr_text:
                    try:
                        current_year = int(yr_text)
                    except ValueError:
                        pass

                if term_text:
                    try:
                        current_term = int(term_text)
                    except ValueError:
                        pass

                # ── Extract course data ──
                code = cells[2].get_text(strip=True)
                if not code:
                    continue  # Skip rows without a course code

                title = cells[3].get_text(strip=True)
                lec_hrs = parse_hours(cells[4].get_text())
                lab_hrs = parse_hours(cells[5].get_text())
                credit_units, is_non_academic = parse_units(cells[6].get_text())
                prerequisites = parse_requisites(cells[7].get_text())
                corequisites = parse_requisites(cells[8].get_text())
                status = classify_row(tr)

                # Description from hidden column 10
                description = ""
                if len(cells) > 10:
                    description = cells[10].get_text(strip=True)

                course = {
                    "code": code,
                    "title": title,
                    "year": current_year,
                    "term": current_term,
                    "lecHrs": lec_hrs,
                    "labHrs": lab_hrs,
                    "creditUnits": credit_units,
                    "isNonAcademic": is_non_academic,
                    "prerequisites": prerequisites,
                    "corequisites": corequisites,
                    "status": status,
                    "description": description,
                }
                courses.append(course)

    return courses


def parse_curriculum(html_path: str) -> dict:
    """Main parsing function. Returns the full structured JSON-ready dict."""
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    soup = BeautifulSoup(html, "lxml")

    metadata = extract_metadata(soup)
    units = extract_units(soup)
    courses = extract_courses(soup)

    return {
        "program": metadata["program"],
        "curriculumYear": metadata["curriculumYear"],
        "yearLevel": metadata["yearLevel"],
        "specialization": metadata["specialization"],
        "units": units,
        "courses": courses,
    }


def print_summary(data: dict) -> None:
    """Print a human-readable summary to stdout."""
    courses = data["courses"]
    total = len(courses)

    # Status breakdown
    status_counts = {}
    for c in courses:
        s = c["status"]
        status_counts[s] = status_counts.get(s, 0) + 1

    # Year/Term breakdown
    year_terms = set()
    for c in courses:
        year_terms.add((c["year"], c["term"]))

    print(f"\n{'=' * 60}")
    print(f"  PathWise Curriculum Parser - Results")
    print(f"{'=' * 60}")
    print(f"  Program:         {data['program']}")
    print(f"  Curriculum Year: {data['curriculumYear']}")
    print(f"  Year Level:      {data['yearLevel']}")
    print(f"  Specialization:  {data['specialization']}")
    print(f"{'-' * 60}")
    print(f"  Units -> Required: {data['units']['required']}  |  "
          f"Credited: {data['units']['credited']}  |  "
          f"Passed: {data['units']['passed']}  |  "
          f"Left: {data['units']['left']}")
    print(f"{'-' * 60}")
    print(f"  Total courses parsed: {total}")
    print(f"  Year/Term groups:     {len(year_terms)}")
    print()
    print(f"  Status Breakdown:")
    for status, count in sorted(status_counts.items()):
        bar = "#" * count
        print(f"    {status:<20s} {count:>3d}  {bar}")
    print(f"{'=' * 60}\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: python parseCurriculum.py <input.html> [output.json]")
        sys.exit(1)

    input_path = sys.argv[1]

    if not os.path.isfile(input_path):
        print(f"ERROR: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    # Default output: curriculum.json in the same directory as input
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        output_path = os.path.join(os.path.dirname(input_path) or ".", "curriculum.json")

    data = parse_curriculum(input_path)
    print_summary(data)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"  [OK] JSON written to: {output_path}")
    print(f"    ({os.path.getsize(output_path):,} bytes)\n")


if __name__ == "__main__":
    main()
