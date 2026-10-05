import { offeringLabel, offeringSource, offeringTerms, type Course } from "@/lib/curriculum";

export default function OfferingEditor({ course, onChange }: { course: Course; onChange: (terms: number[] | undefined) => void }) {
  const terms = offeringTerms(course);
  return <fieldset className="offering-editor">
    <legend>Offering terms for {course.code}</legend>
    <p><strong>{offeringLabel(course)}</strong> · {offeringSource(course)}. Confirm the actual schedule with your school.</p>
    <div className="offering-choices">{[1, 2, 3].map(term => <label key={term}>
      <input type="checkbox" checked={terms.includes(term)} disabled={terms.length === 1 && terms.includes(term)} onChange={e => onChange(e.target.checked ? [...terms, term] : terms.filter(t => t !== term))} />Term {term}
    </label>)}</div>
    <small>Keep at least one term selected. These are planning assumptions, not an official school schedule.</small>
    {course.offeredTerms && <button type="button" className="text-button" onClick={() => onChange(undefined)}>Use imported offering · Term {course.originalTerm}</button>}
  </fieldset>;
}
