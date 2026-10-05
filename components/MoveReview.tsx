import type { RefObject } from "react";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { offeringLabel, offeringSource, type Course } from "@/lib/curriculum";
import type { previewMove } from "@/lib/planning-insights";
import { termLabel } from "@/lib/planner";

const finishText = (finish: number | null) => finish === null ? "Needs review" : finish === 0 ? "Complete" : termLabel(finish);

export default function MoveReview({ dialogRef, course, destination, preview, onCancel, onConfirm }: {
  dialogRef: RefObject<HTMLDialogElement | null>; course: Course; destination: number;
  preview: ReturnType<typeof previewMove>; onCancel: () => void; onConfirm: () => void;
}) {
  return <dialog ref={dialogRef} className="confirm-dialog move-review" aria-labelledby="confirm-move-title" onClose={onCancel}>
    <div className="confirm-header"><div><span className="section-index">SEE THE CONSEQUENCES</span><h2 id="confirm-move-title">Move {course.code} to {termLabel(destination)}?</h2><p>{course.title}</p></div><button className="icon-button" aria-label="Cancel move" onClick={onCancel}><X size={18} /></button></div>
    <div className="confirm-body">
      <p className="move-placement"><strong>Your course placement:</strong> {termLabel(preview.placement.before)} → {termLabel(preview.placement.after)}</p>
      {preview.offeringConflict && <div className="move-warning" role="alert"><AlertTriangle size={19} aria-hidden="true" /><p><strong>This term may not be available.</strong> {offeringSource(course)}: {offeringLabel(course)}. Confirm with your school before relying on an off-term placement.</p></div>}
      {preview.requirements.length > 0 && <p className="offering-warning">At this placement, review requirements: {preview.requirements.join(", ")}. Other courses may need new dates.</p>}
      <div className="move-finishes"><div><span>Current suggested finish</span><strong>{finishText(preview.before.finish)}</strong></div><ArrowRight size={20} aria-hidden="true" /><div><span>After this move</span><strong>{finishText(preview.after.finish)}</strong></div></div>
      <p className="move-consequence" role="status">{preview.after.unresolved.length ? `${preview.after.unresolved.length} course${preview.after.unresolved.length === 1 ? "" : "s"} would be unresolved. There is no complete finish estimate after this move.` : preview.delta === null ? "This move produces a complete suggested route; the earlier route could not be completed." : preview.delta === 0 ? "The modeled finish stays the same." : `The modeled finish moves ${Math.abs(preview.delta)} term${Math.abs(preview.delta) === 1 ? "" : "s"} ${preview.delta > 0 ? "later" : "earlier"}.`}</p>
      {preview.after.unresolved.length > 0 && <ul className="move-unresolved">{preview.after.unresolved.map(item => <li key={item.code}><strong>{item.code}</strong> · {item.reason}</li>)}</ul>}
      {preview.changed.length > 0 && <details className="move-changes" open><summary>{preview.changed.length} suggested course date{preview.changed.length === 1 ? "" : "s"} affected</summary><ul>{preview.changed.map(item => <li key={item.code}><strong>{item.code}</strong><span>{item.before === null ? "Unresolved" : termLabel(item.before)}<ArrowRight size={13} aria-hidden="true" />{item.after === null ? "Unresolved" : termLabel(item.after)}</span></li>)}</ul></details>}
      <p className="confirm-subnote">Confirming places this course only. My route recalculates around it; choose “Use this plan” to apply the other suggested dates. Finish estimates depend on your offerings, workload and passing assumptions.</p>
    </div>
    <div className="confirm-actions"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" onClick={onConfirm}>{preview.offeringConflict ? "Simulate off-term move" : "Confirm move"}<ArrowRight size={15} /></button></div>
  </dialog>;
}
