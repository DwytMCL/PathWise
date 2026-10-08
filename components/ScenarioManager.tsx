import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, GitCompareArrows, Pencil, Plus, Trash2, X } from "lucide-react";
import { offeringLabel, type Curriculum } from "@/lib/curriculum";
import { isComplete, planCurriculum, termLabel, type CurriculumPlan, type PlanOptions } from "@/lib/planner";
import { MAX_SCENARIOS, type Scenario } from "@/lib/workspace";
import { countWaitingTerms } from "@/lib/planning-insights";

const finishText = (finish: number | null) => finish === null ? "Needs review" : finish === 0 ? "Complete" : termLabel(finish);

export default function ScenarioManager({ curriculum, options, plan, scenarios, settingsDirty = false, onSave, onRestore, onRename, onDelete }: {
  curriculum: Curriculum; options: PlanOptions; plan: CurriculumPlan; scenarios: Scenario[];
  settingsDirty?: boolean;
  onSave: (name: string) => void; onRestore: (id: string) => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [comparison, setComparison] = useState<string | null>(null);
  const [error, setError] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const renameTriggerRef = useRef<HTMLButtonElement | null>(null);
  const saveRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (renaming) renameRef.current?.focus();
    else if (renameTriggerRef.current?.isConnected) { renameTriggerRef.current.focus(); renameTriggerRef.current = null; }
  }, [renaming]);
  const results = useMemo(() => scenarios.map(scenario => ({ scenario, result: planCurriculum(scenario.curriculum.courses, scenario.options) })), [scenarios]);
  const compared = results.find(s => s.scenario.id === comparison);
  const delta = compared && plan.finish !== null && compared.result.finish !== null ? compared.result.finish - plan.finish : null;
  function perform(action: () => void) {
    try { action(); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "This scenario could not be saved."); }
  }
  const date = (code: string, result: CurriculumPlan, courses: Curriculum["courses"], assumption: boolean) => {
    const index = result.assignments.get(code);
    const course = courses.find(c => c.code === code);
    return index !== undefined ? termLabel(index) : course && isComplete(course) ? "Completed / exempted" : course?.status === "InCurrentLoad" && assumption ? "Current load · assumed passed" : "Unresolved";
  };
  const courseDetails = (code: string, courses: Curriculum["courses"]) => {
    const course = courses.find(c => c.code === code)!;
    const status = course.status === "NotYetTaken" ? "Not yet taken" : course.status === "InCurrentLoad" ? "In current load" : course.status;
    return <small>{status} · {offeringLabel(course)}{course.isPinned ? " · Manual placement" : ""}</small>;
  };
  return <details className="scenario-manager">
    <summary><span><GitCompareArrows size={19} aria-hidden="true" /><strong>Saved scenarios</strong><small>{scenarios.length} of {MAX_SCENARIOS}</small></span><ChevronDown size={17} aria-hidden="true" /></summary>
    <div className="scenario-content">
      <p>Keep this route’s course dates, progress, offerings and settings. Scenarios stay in this session unless you download your plan or enable device autosave.</p>
      <form className="scenario-save" onSubmit={e => { e.preventDefault(); perform(() => { onSave(name); setName(""); }); }}>
        <label>Scenario name<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Working part-time" /></label>
        <button ref={saveRef} className="secondary-button" disabled={settingsDirty || scenarios.length >= MAX_SCENARIOS}><Plus size={16} aria-hidden="true" />Save current route</button>
      </form>
      {settingsDirty && <p role="status">Select Update my route before saving a scenario with your changed settings.</p>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      {!scenarios.length && <p className="empty-scenarios">Your first saved scenario will appear here. Try a different workload, then compare the complete schedules.</p>}
      <ul className="scenario-list">{results.map(({ scenario, result }) => <li key={scenario.id}>
        <div>{renaming === scenario.id ? <form className="scenario-rename" onSubmit={e => { e.preventDefault(); perform(() => { onRename(scenario.id, editName); setRenaming(null); }); }}><label className="sr-only" htmlFor={`scenario-name-${scenario.id}`}>Rename {scenario.name}</label><input id={`scenario-name-${scenario.id}`} ref={renameRef} required maxLength={60} value={editName} onChange={e => setEditName(e.target.value)} /><button className="text-button">Save name</button><button type="button" className="icon-button" aria-label="Cancel rename" onClick={() => setRenaming(null)}><X size={16} /></button></form> : <h3>{scenario.name}</h3>}<strong>{finishText(result.finish)}</strong><p>{scenario.options.maxUnits}-unit limit · Starts {termLabel(scenario.options.startTerm)} · {result.assignments.size} courses</p></div>
        <div className="scenario-actions"><button className="secondary-button" aria-pressed={comparison === scenario.id} onClick={() => setComparison(comparison === scenario.id ? null : scenario.id)}>Compare</button><button className="text-button" onClick={() => onRestore(scenario.id)}>Restore <ArrowRight size={14} /></button><button className="icon-button" aria-label={`Rename ${scenario.name}`} onClick={e => { renameTriggerRef.current = e.currentTarget; setRenaming(scenario.id); setEditName(scenario.name); }}><Pencil size={15} /></button><button className="icon-button" aria-label={`Delete ${scenario.name}`} onClick={() => { onDelete(scenario.id); saveRef.current?.focus(); }}><Trash2 size={15} /></button></div>
      </li>)}</ul>
      {compared && <section className="scenario-comparison" aria-label={`Compare with ${compared.scenario.name}`}>
        <div className="comparison-heading"><h3>Current route vs. {compared.scenario.name}</h3><button className="icon-button" aria-label="Close scenario comparison" onClick={() => setComparison(null)}><X size={16} /></button></div>
        <p>{delta === null ? "A route needs review; no complete finish difference is available." : delta === 0 ? "Both routes have the same projected finish." : `This saved scenario finishes ${Math.abs(delta)} term${Math.abs(delta) === 1 ? "" : "s"} ${delta > 0 ? "later" : "earlier"} than your current route.`}</p>
        {settingsDirty && <p role="status">This comparison uses your applied settings. Update your route to include your edits.</p>}
        <div className="comparison-overview">{[
          { label: "Current route", result: plan, settings: options, courses: curriculum.courses },
          { label: compared.scenario.name, result: compared.result, settings: compared.scenario.options, courses: compared.scenario.curriculum.courses },
        ].map(({ label, result, settings, courses }, index) => <div key={index}>
          <span>{label}</span><strong>{finishText(result.finish)}</strong>
          <dl><div><dt>Workload limit</dt><dd>{settings.maxUnits} units / term</dd></div><div><dt>Starting from</dt><dd>{termLabel(settings.startTerm)}</dd></div><div><dt>Waiting terms</dt><dd>{countWaitingTerms(result, courses, settings) ?? "Needs review"}</dd></div><div><dt>Courses scheduled</dt><dd>{result.assignments.size}</dd></div><div><dt>Needs review</dt><dd>{result.unresolved.length}</dd></div></dl>
        </div>)}</div>
        <p className="comparison-changes">{curriculum.courses.filter(course => date(course.code, plan, curriculum.courses, options.assumeCurrentPass) !== date(course.code, compared.result, compared.scenario.curriculum.courses, compared.scenario.options.assumeCurrentPass)).length} course schedule outcomes differ. Review the dates and assumptions below before restoring.</p>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Keyboard users can scroll this named table region. */}
        <div className="table-scroll" tabIndex={0} role="region" aria-label="Scenario course schedule comparison"><table><caption>Full course schedules · {options.maxUnits} units now / {compared.scenario.options.maxUnits} units saved</caption><thead><tr><th scope="col">Course</th><th scope="col">Current route</th><th scope="col">{compared.scenario.name}</th></tr></thead><tbody>{curriculum.courses.map(course => <tr key={course.code}><th scope="row">{course.code}<small>{course.title}</small></th><td>{date(course.code, plan, curriculum.courses, options.assumeCurrentPass)}{courseDetails(course.code, curriculum.courses)}</td><td>{date(course.code, compared.result, compared.scenario.curriculum.courses, compared.scenario.options.assumeCurrentPass)}{courseDetails(course.code, compared.scenario.curriculum.courses)}</td></tr>)}</tbody></table></div>
        <small>Restoring also restores the saved statuses and offerings. Undo returns to your current workspace.</small>
      </section>}
    </div>
  </details>;
}
