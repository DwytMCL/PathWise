import { ArrowRight, ArrowUpRight, Check, GitBranch, GraduationCap, Layers, LockKeyhole, Route } from "lucide-react";
import { START_TERM, UNITS_LEFT } from "./example";
import s from "./Landing.module.css";

const upNext = [
  { title: "Data structures", code: "CS201", offering: "Terms 1 & 3", Icon: GitBranch },
  { title: "Discrete mathematics", code: "MA202", offering: "Every term", Icon: Layers },
  { title: "Computer systems", code: "CS203", offering: "Term 1 only", Icon: Route },
];

// A still of the planner built from fictional courses; assistive tech reads the caption instead.
export default function ProductWindow() {
  return <figure className={s.product} aria-labelledby="product-caption" data-product data-ui>
    <div className={s.productGlow} aria-hidden="true" />
    <div className={s.window} data-window aria-hidden="true">
      <div className={s.chrome}><span className={s.dots}><i /><i /><i /></span><span><LockKeyhole size={12} /> PathWise · My route</span><ArrowUpRight size={14} /></div>
      <div className={s.windowBody}>
        <div className={s.rail}>
          <span className={s.railProgram}><GraduationCap size={18} /><span>Computer science<small>Example curriculum</small></span></span>
          <span className={s.railNav}><span data-active><Route size={15} /> My route</span><span><Layers size={15} /> Term board</span><span><GitBranch size={15} /> Requirements</span></span>
          <span className={s.railPrivacy}><LockKeyhole size={12} /> Private on this device</span>
        </div>
        <div className={s.plan}>
          <div className={s.planHead}><div><small>Your way forward</small><p>A plan you can see.</p></div><span><Check size={13} /> Ready to explore</span></div>
          <div className={s.forecast}><span><small>Projected finish</small><strong>Year 4 · Term 1</strong></span><span><strong>4</strong><small>terms ahead</small></span><span><strong>{UNITS_LEFT}</strong><small>units left</small></span></div>
          <div className={s.termHead}><strong>{START_TERM}</strong><span>Up next · 18 of 18 units</span></div>
          <ul className={s.courseList}>{upNext.map(({ title, code, offering, Icon }) => <li key={code}>
            <span className={s.courseIcon}><Icon size={16} /></span>
            <span><strong>{title}</strong><small>{code} · 3 units</small></span>
            <span className={s.offering}>{offering}</span><ArrowRight size={14} />
          </li>)}</ul>
          <div className={s.chainStrip}>{["Data structures", "Algorithms", "Software studio", "Capstone"].map((label, i) => <span key={label}>{label}{i < 3 && <ArrowRight size={11} />}</span>)}</div>
        </div>
      </div>
    </div>
    <div className={s.floatNext} data-float="left" aria-hidden="true">
      <span className={s.floatIcon}><GitBranch size={22} /></span>
      <span className={s.floatLabel}>Your next step</span>
      <strong>Data structures</strong>
      <span className={s.floatBody}>Opens four courses in the terms ahead.</span>
      <span className={s.floatFoot}>Terms 1 & 3 <ArrowUpRight size={13} /></span>
    </div>
    <div className={s.floatFinish} data-float="right" aria-hidden="true">
      <div className={s.ring}><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" fill="none" stroke="#e3ecf5" strokeWidth="6" /><circle data-ring cx="50" cy="50" r="43" fill="none" stroke="#5f8fc0" strokeWidth="6" strokeLinecap="round" strokeDasharray="270" strokeDashoffset="68" transform="rotate(-90 50 50)" /></svg><span><GraduationCap size={26} /></span></div>
      <strong>The finish is in view.</strong>
      <span>Year 4 · Term 1</span>
    </div>
    <figcaption id="product-caption">The PathWise route view, shown with a fictional curriculum: finish in Year 4 · Term 1 with {UNITS_LEFT} units left.</figcaption>
  </figure>;
}
