import { ArrowRight, Check, FileUp, LockKeyhole } from "lucide-react";

export default function Landing({ onOpen, busy }: { onOpen: () => void; busy: boolean }) {
  return <>
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="hero-copy">
        <span className="section-kicker">A LITTLE CLARITY. A LONG WAY FORWARD.</span>
        <h1 id="landing-title">Your degree.<br />A clearer <em>way through.</em></h1>
        <p className="hero-sub">Know what to take next, what it unlocks, and how to get to the finish. Turn your curriculum into a plan you can actually understand.</p>
        <div className="hero-actions"><button className="primary-button" onClick={onOpen} disabled={busy}><FileUp size={18} />{busy ? "Reading your file…" : "Open my curriculum"}<ArrowRight size={17} /></button><a className="text-button" href="#how-it-works">How it works</a></div>
        <p className="hero-file-note">JSON or a saved OneMCL page. You can also drop your file here.</p>
        <div className="privacy-inline"><LockKeyhole size={15} /><span>No account. Your curriculum stays in your browser.</span></div>
      </div>
      <div className="route-preview" aria-label="Illustrative three-course route using fictional courses">
        <div className="preview-top"><span className="section-kicker">YOUR ROUTE, AT A GLANCE</span><span className="subtle-badge">Illustration</span></div>
        <h2>One step opens the next.</h2>
        <ol className="preview-route">
          <li><span className="preview-stop">1</span><div><span className="preview-date">YEAR 2 · TERM 1</span><h3>Build the foundation</h3><p>FND100 · Foundations</p><small><Check size={13} /> No prerequisites</small></div></li>
          <li><span className="preview-stop">2</span><div><span className="preview-date">YEAR 2 · TERM 3</span><h3>Keep the important offering</h3><p>MET200 · Methods</p><small>Requires FND100 · Inferred Term 3 offering</small></div></li>
          <li><span className="preview-stop">3</span><div><span className="preview-date">YEAR 3 · TERM 1</span><h3>Reach the final course</h3><p>CAP300 · Capstone</p><small>Requires MET200</small></div></li>
        </ol>
        <div className="preview-insight"><span>Why timing matters</span><p>In this example, skipping the Term 3 offering moves the finish <strong>one academic year later.</strong></p></div>
        <p className="preview-caption">Fictional courses · Three terms per year · Passing grades assumed. Your own route appears after import.</p>
      </div>
    </section>
    <section className="process-section" id="how-it-works" aria-labelledby="process-title">
      <div className="section-heading"><div><span className="section-kicker">FROM COURSE LIST TO CLEAR PLAN</span><h2 id="process-title">Less guessing.<br />More moving forward.</h2></div><p>Start with your actual curriculum. Explore a route, try a change, and keep the plan that works for you.</p></div>
      <div className="process-grid">{[
        ["01", "Bring your curriculum", "Open your exported JSON, saved OneMCL HTML page, or a PathWise plan you saved earlier."],
        ["02", "See your next step", "Choose your starting term and workload. See a route that considers requirements and term offerings."],
        ["03", "Make it work for you", "Compare a lighter workload, trace a dependency, or move a course. Save your plan to return to it."],
      ].map(([n,title,body]) => <article className="process-step" key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    </section>
    <section className="privacy-section" id="privacy" aria-labelledby="privacy-title"><LockKeyhole size={28} /><div><span className="section-kicker">YOUR FILE. YOUR PLAN.</span><h2 id="privacy-title">A private space to figure it out.</h2><p>Your curriculum is read in this browser and is never uploaded. Save your plan before closing or refreshing. Offering terms are inferred from your file; confirm actual schedules with your school.</p></div><button className="secondary-button" onClick={onOpen} disabled={busy}>Get started <ArrowRight size={16} /></button></section>
    <footer className="landing-footer"><span>PathWise · A clearer way through your degree.</span><a href="#landing-title">Back to top ↑</a></footer>
  </>;
}
