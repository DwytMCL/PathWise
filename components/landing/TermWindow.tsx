import { Check, Clock3, Route } from "lucide-react";
import { terms } from "./example";
import s from "./Landing.module.css";

const offered = [true, false, false, true];

// A once-a-year course finding its term on the fictional route.
export default function TermWindow() {
  return <figure className={s.termWindow} data-window-scene data-ui aria-labelledby="window-caption">
    <div className={s.termGrid}>
      {terms.map((term, i) => <div key={term} className={s.termColumn} data-term-column data-offered={offered[i] || undefined}>
        <span className={s.termName}>{term}</span>
        <span className={s.termState}>{offered[i] ? <><Check size={14} /> Offered</> : "Not offered"}</span>
      </div>)}
      <div className={s.termCard} data-term-card>
        <span className={s.courseIcon}><Route size={17} /></span>
        <span><strong>Computer systems</strong><small>CS203 · 3 units · Term 1 only</small></span>
        <span className={s.cardStatus}>
          <span data-status="wait"><Clock3 size={14} /> Not offered in Term 2. Next run: Y4 · T1</span>
          <span data-status="ok"><Check size={14} /> In its window. No year lost.</span>
        </span>
      </div>
    </div>
    <figcaption id="window-caption">Fictional example: Computer systems runs only in Term 1, so PathWise plans it in Year 3 · Term 1 instead of waiting until Year 4.</figcaption>
  </figure>;
}
