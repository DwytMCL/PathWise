import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, GitBranch, GraduationCap, Layers, LockKeyhole, Route, SlidersHorizontal, Sparkles, Upload } from "lucide-react";
import s from "./Landing.module.css";

function Brand() {
  return <Image src="/pathwise-logo.svg" width={150} height={38} alt="PathWise" className={s.brand} priority />;
}

// A presentation of fictional courses, never an imported or saved student plan.
function PlannerPreview() {
  return <div className={s.productStage} aria-hidden="true">
    <div className={s.stageReflection} />
    <div className={s.productWindow}>
      <div className={s.windowChrome}><span className={s.windowDots}><i /><i /><i /></span><span><LockKeyhole size={10} /> PathWise / My route</span><span className={s.windowAction}><ArrowUpRight size={12} /></span></div>
      <div className={s.windowContent}>
        <div className={s.windowRail}><Brand /><div className={s.miniProgram}><GraduationCap size={17} /><span>Computer science<small>Example curriculum</small></span></div><div className={s.miniNav}><span><Route size={14} /> My route</span><span><Layers size={14} /> Term board</span><span><GitBranch size={14} /> Requirements</span></div><span className={s.miniPrivacy}><LockKeyhole size={11} /> Private on your device</span></div>
        <div className={s.windowPlan}>
          <div className={s.miniHeading}><div><small>YOUR WAY FORWARD</small><h2>A plan you can see.</h2></div><span><Check size={10} /> Ready to explore</span></div>
          <div className={s.miniForecast}><span><small>Projected finish</small><strong>Year 4 · Term 1</strong></span><span><strong>4</strong><small>terms ahead</small></span><span><strong>33</strong><small>units left</small></span></div>
          <div className={s.miniTerm}><strong>Year 3 · Term 1</strong><span>Up next / 12 units</span></div>
          <div className={s.miniCourseList}>{[
            { title: "Data structures", code: "CS201", offering: "Terms 1 & 3", Icon: GitBranch },
            { title: "Discrete mathematics", code: "MA202", offering: "Every term", Icon: Layers },
            { title: "Computer systems", code: "CS203", offering: "Term 1 only", Icon: Route },
          ].map(({title,code,offering,Icon}) => <div key={code}><span className={s.miniCourseIcon}><Icon size={15} /></span><span><strong>{title}</strong><small>{code} · 3 units</small></span><span className={s.miniOffering}>{offering}</span><ArrowRight size={13} /></div>)}</div>
          <div className={s.miniChain}>{["Data structures", "Algorithms", "Software studio", "Capstone"].map((label,i) => <span key={label}>{label}{i < 3 && <ArrowRight size={10} />}</span>)}</div>
        </div>
      </div>
    </div>
    <div className={s.nextStepFloat}><span className={s.floatIcon}><GitBranch size={24} /></span><span className={s.floatLabel}>Your next step</span><strong>Data structures</strong><span className={s.floatBody}>A foundation for the<br />courses ahead.</span><span className={s.floatFoot}>Offered in Terms 1 & 3 <ArrowUpRight size={13} /></span></div>
    <div className={s.finishFloat}><div className={s.finishRing}><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" fill="none" stroke="#e5edf4" strokeWidth="5" /><circle cx="50" cy="50" r="43" fill="none" stroke="#648ebe" strokeWidth="5" strokeLinecap="round" strokeDasharray="215 270" transform="rotate(-90 50 50)" /></svg><span><GraduationCap size={27} /></span></div><strong>The finish is in view.</strong><span>Year 4 · Term 1</span><div><span><i /> 4 terms ahead</span><ArrowUpRight size={14} /></div></div>
  </div>;
}

export default function Landing({ onOpen, busy }: { onOpen: () => void; busy: boolean }) {
  const steps = [
    { Icon: Upload, title: "Bring your curriculum", copy: "Open your exported JSON, saved OneMCL page, or a PathWise plan." },
    { Icon: Route, title: "See the connections", copy: "Find what you can take next, what it unlocks, and when it’s offered." },
    { Icon: SlidersHorizontal, title: "Find your pace", copy: "Compare course loads, try a change, and save the route that works for you." },
  ];
  return <div className={s.horizon}>
    <section className={s.hero} aria-labelledby="landing-title">
      <div className={s.atmosphere} aria-hidden="true"><div className={s.skyLight} /><div className={s.horizonLight} /><div className={s.groundLight} /></div>
      <header className={s.floatingNav}><a href="#landing-title" aria-label="PathWise home"><Brand /></a><nav aria-label="Page navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Your privacy</a></nav><button onClick={onOpen} disabled={busy}>Open curriculum<ArrowUpRight size={13} /></button></header>
      <div className={s.heroCopy}>
        <span className={s.heroEyebrow}><Route size={14} /> A clearer way through your degree</span>
        <h1 id="landing-title">Your degree.<br />Coming into focus.</h1>
        <p>See how your courses connect.<br />Find a route that works for what comes next.</p>
        <div className={s.heroActions}><button className={s.pill} onClick={onOpen} disabled={busy}>{busy ? "Reading your file…" : "Open my curriculum"}<ArrowUpRight size={16} /></button><a href="#how-it-works">Take a closer look<ArrowDown size={14} /></a></div>
        <span className={s.privacyLine}><LockKeyhole size={11} /> No account. Your curriculum stays with you.</span>
        <p className={s.fileHint}>JSON, saved HTML, or a PathWise plan. You can also drop your file here.</p>
      </div>
      <PlannerPreview />
      <p className={s.stageCaption}>A glimpse of your bigger picture. Shown with fictional courses.</p>
    </section>
    <div className={s.capabilityLine}><span><GitBranch size={16} /> Connected prerequisites</span><span><Layers size={16} /> Offering terms in view</span><span><SlidersHorizontal size={16} /> A pace that works for you</span></div>
    <section id="how-it-works" className={s.focusSection} aria-labelledby="focus-title">
      <div className={s.focusCopy}><span className={s.sectionLabel}>MAKE ROOM FOR CLARITY</span><h2 id="focus-title">The next course.<br />And everything<br />it makes possible.</h2><p>A curriculum is more than a list. See what’s ready to take, what it unlocks, and when it’s offered—together, in one clear view.</p><button onClick={onOpen} disabled={busy} className={s.textAction}>See your route<ArrowUpRight size={17} /></button></div>
      <div className={s.focusVisual} aria-hidden="true"><div className={s.focusMain}><span className={s.focusIcon}><GitBranch size={25} /></span><span className={s.sectionLabel}>COURSE IN FOCUS</span><h3>Data structures</h3><p>CS201 / 3 units</p><div className={s.focusAvailability}><span><i /> When it’s available</span><strong>Terms 1 & 3</strong></div><div className={s.focusFollowing}><span>WHAT IT OPENS</span><div><span>Algorithms</span><ArrowRight size={14} /><span>Software studio</span><ArrowRight size={14} /><GraduationCap size={18} /></div></div></div><div className={s.focusNote}><span className={s.noteMark}><Sparkles size={18} /></span><p>Small decisions.<br /><strong>A clearer path forward.</strong></p></div></div>
    </section>
    <section className={s.startSection} aria-labelledby="steps-title"><span className={s.sectionLabel}>FROM YOUR FILE TO YOUR FUTURE</span><h2 id="steps-title">A little perspective goes a long way.</h2><div className={s.startSteps}>{steps.map(({Icon,title,copy}) => <article key={title}><span><Icon size={23} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section id="privacy" className={s.privateSection} aria-labelledby="privacy-title"><span className={s.privateIcon}><LockKeyhole size={23} /></span><h2 id="privacy-title">Your plans are personal.<br />Let’s keep them that way.</h2><p>Your curriculum is processed in your browser.<br />No account, no server upload, no extra hoops.</p><button className={s.pill} onClick={onOpen} disabled={busy}>Take the first step<ArrowUpRight size={16} /></button><p className={s.privateNote}>Save your plan before closing or refreshing. Offering terms are inferred from your file; confirm schedules with your school.</p></section>
    <footer className={s.footer}><Brand /><span>A clearer way through.</span><a href="#landing-title">Back to top<ArrowUpRight size={13} /></a></footer>
  </div>;
}
