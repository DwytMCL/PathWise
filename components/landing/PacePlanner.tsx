"use client";

import { useState } from "react";
import { paceOptions, paceTermLabels, START_TERM, UNITS_LEFT } from "./example";
import s from "./Landing.module.css";

const MAX_UNITS = 21;

// A small working model of the unit-limit setting, using the fictional curriculum.
export default function PacePlanner() {
  const [units, setUnits] = useState(18);
  const pace = paceOptions.find(option => option.units === units)!;
  return <div className={s.pace} data-pace data-ui>
    <fieldset className={s.paceControl}>
      <legend>Units per term</legend>
      <div>{paceOptions.map(option => <label key={option.units}>
        <input type="radio" name="pace" value={option.units} aria-label={`${option.units} units, ${option.label.toLowerCase()}`} checked={units === option.units} onChange={() => setUnits(option.units)} />
        <span><strong>{option.units}</strong><small>{option.label}</small></span>
      </label>)}</div>
    </fieldset>
    <div className={s.paceResult} aria-live="polite">
      <span>Projected finish</span>
      <strong key={pace.finish + pace.units}>{pace.finish}</strong>
      <p>{pace.note}</p>
    </div>
    <ol className={s.paceBars} aria-label={`Units planned per term at ${units} units`}>
      {paceTermLabels.map((label, i) => {
        const planned = pace.terms[i];
        return <li key={label} data-empty={planned === undefined || undefined}>
          <span className={s.barTrack}><span className={s.bar} style={{ transform: `scaleY(${(planned ?? 0) / MAX_UNITS})`, transitionDelay: `${i * 45}ms` }} /></span>
          <strong>{planned ?? "—"}</strong>
          <small>{label}</small>
        </li>;
      })}
    </ol>
    <p className={s.paceFootnote}>Fictional example: {UNITS_LEFT} units left from {START_TERM}.</p>
  </div>;
}
