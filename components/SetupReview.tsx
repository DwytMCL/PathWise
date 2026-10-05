import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Search } from "lucide-react";
import { statuses, type Course, type Curriculum } from "@/lib/curriculum";
import { isComplete, planCurriculum, termLabel, type PlanOptions } from "@/lib/planner";
import OfferingEditor from "./OfferingEditor";

const labels = ["Your progress", "Your schedule", "Your route"];
const statusText = (status: Course["status"]) => status === "InCurrentLoad" ? "In current load" : status === "NotYetTaken" ? "Not yet taken" : status;

export default function SetupReview({ curriculum, options, onStatus, onOfferings, onDone, onDraftChange }: {
  curriculum: Curriculum; options: PlanOptions; onStatus: (code: string, status: Course["status"]) => void;
  onOfferings: (code: string, terms: number[] | undefined) => void; onDone: (options: PlanOptions) => void;
  onDraftChange?: (dirty: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState(options);
  const [query, setQuery] = useState("");
  const dirty = settings.startTerm !== options.startTerm || settings.maxUnits !== options.maxUnits || settings.assumeCurrentPass !== options.assumeCurrentPass;
  useEffect(() => { onDraftChange?.(dirty); }, [dirty, onDraftChange]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, [step]);
  const courses = curriculum.courses;
  const shown = courses.filter(c => `${c.code} ${c.title}`.toLowerCase().includes(query.trim().toLowerCase()));
  const plan = useMemo(() => {
    const valid = Number.isInteger(settings.startTerm) && settings.startTerm >= 1 && settings.startTerm <= 300 && settings.maxUnits >= 1 && settings.maxUnits <= 60;
    return planCurriculum(courses, valid ? settings : options);
  }, [courses, settings, options]);
  const current = courses.filter(c => c.status === "InCurrentLoad");
  function next() { setQuery(""); setStep(value => value + 1); }
  return <section className="setup-review" aria-labelledby="setup-title">
    <div className="setup-header"><span className="section-index">MAKE IT YOUR PLAN</span><ol className="setup-steps" aria-label="Setup progress">{labels.map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined}><span>{i < step ? <Check size={13} /> : i + 1}</span>{label}</li>)}</ol></div>
    <h2 id="setup-title" ref={titleRef} tabIndex={-1}>{step === 0 ? "Start with where you are." : step === 1 ? "Make room for your life." : "Your route, with the assumptions in view."}</h2>
    {step === 0 && <>
      <p>We read {courses.length} courses from your file. Confirm what you’ve completed and what you’re taking now.</p>
      <div className="setup-progress"><strong>{courses.filter(isComplete).length} completed or exempted</strong><span>{current.length} in your current load</span></div>
      <label className="setup-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Find a course during setup</span><input type="search" placeholder="Find a course by code or title" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <ul className="setup-course-list">{shown.map(course => <li key={course.code}><div><strong>{course.code}</strong><span>{course.title}</span></div><label><span className="sr-only">Status for {course.code}</span><select value={course.status} onChange={e => onStatus(course.code, e.target.value as Course["status"])}>{statuses.map(status => <option key={status} value={status}>{statusText(status)}</option>)}</select></label></li>)}</ul>
      {!shown.length && <p role="status">No courses match. Try another code or title.</p>}
      <div className="setup-actions"><button className="primary-button" onClick={next}>Continue <ArrowRight size={16} /></button></div>
    </>}
    {step === 1 && <form onSubmit={e => { e.preventDefault(); next(); }}>
      <p>Choose your next starting term and a workload you can sustain. You can change these later.</p>
      <div className="setup-settings"><label>Starting year<input type="number" min={1} max={100} required value={Math.floor((settings.startTerm - 1) / 3) + 1} onChange={e => setSettings({ ...settings, startTerm: (Number(e.target.value) - 1) * 3 + (settings.startTerm - 1) % 3 + 1 })} /></label><label>Starting term<select value={(settings.startTerm - 1) % 3 + 1} onChange={e => setSettings({ ...settings, startTerm: Math.floor((settings.startTerm - 1) / 3) * 3 + Number(e.target.value) })}>{[1, 2, 3].map(term => <option key={term} value={term}>Term {term}</option>)}</select></label><label>Maximum units per term<input type="number" min={1} max={60} step={.5} required value={settings.maxUnits} onChange={e => setSettings({ ...settings, maxUnits: Number(e.target.value) })} /></label></div>
      <div className="setup-paces" role="group" aria-label="Choose workload"><button type="button" className="secondary-button" aria-pressed={settings.maxUnits === 18} onClick={() => setSettings({ ...settings, maxUnits: 18 })}>18 units</button><button type="button" className="secondary-button" aria-pressed={settings.maxUnits === 12} onClick={() => setSettings({ ...settings, maxUnits: 12 })}>Lighter · 12 units</button></div>
      {current.length > 0 && <label className="setup-assumption"><input type="checkbox" checked={settings.assumeCurrentPass} onChange={e => setSettings({ ...settings, assumeCurrentPass: e.target.checked })} />Assume I pass my {current.length} current courses after their planned term</label>}
      <details className="setup-offerings"><summary>Review course offerings</summary><p>Imported term placements are treated as recurring annual offerings. Set multiple terms only when appropriate for your school.</p>{courses.filter(c => !isComplete(c)).map(course => <div key={course.code}><h3>{course.code} · {course.title}</h3><OfferingEditor course={course} onChange={terms => onOfferings(course.code, terms)} /></div>)}</details>
      <div className="setup-actions"><button type="button" className="text-button" onClick={() => setStep(0)}><ArrowLeft size={16} />Back</button><button className="primary-button">Review my route <ArrowRight size={16} /></button></div>
    </form>}
    {step === 2 && <>
      <div className="setup-forecast"><GraduationCap size={28} aria-hidden="true" /><div><span>{plan.unresolved.length ? "REQUIREMENTS TO REVIEW" : "PROJECTED FINISH"}</span><strong>{plan.unresolved.length ? `${plan.unresolved.length} course${plan.unresolved.length === 1 ? "" : "s"} need review` : plan.finish === 0 ? "Nothing left to schedule" : plan.finish === null ? "No complete estimate" : termLabel(plan.finish)}</strong><p>{plan.assignments.size} future courses · {settings.maxUnits}-unit limit · Starts {termLabel(settings.startTerm)}</p></div></div>
      {plan.unresolved.length > 0 && <ul className="setup-unresolved">{plan.unresolved.map(item => <li key={item.code}><strong>{item.code}</strong> · {item.reason}</li>)}</ul>}
      <ul className="setup-assumptions"><li>Three terms per year; offering terms repeat annually.</li><li>Future courses are assumed passed. {settings.assumeCurrentPass ? "Current courses count as passed after their scheduled term." : "Current courses are rescheduled."}</li><li>{courses.filter(c => c.offeredTerms).length} custom course offerings; the rest are inferred from your file.</li><li>Prerequisites and corequisites are checked. Additional school enrollment rules are not modeled.</li></ul>
      <p>Open any course to inspect its requirements, change offerings, or understand why it matters to this route.</p>
      <div className="setup-actions"><button className="text-button" onClick={() => setStep(1)}><ArrowLeft size={16} />Back</button><button className="primary-button" onClick={() => onDone(settings)}>Open my route <ArrowRight size={16} /></button></div>
    </>}
  </section>;
}
