"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, GitBranch, GraduationCap, Layers, LockKeyhole, Route, SlidersHorizontal, Sparkles, Upload } from "lucide-react";
import s from "./Landing.module.css";

function Brand() {
  return <Image src="/pathwise-logo.svg" width={150} height={38} alt="PathWise" className={s.brand} priority />;
}

function HeadingLines({ lines }: { lines: string[] }) {
  return lines.map((line, index) => <span className={s.revealLine} key={line}><span>{line}{index < lines.length - 1 ? " " : ""}</span></span>);
}

// A presentation of fictional courses, never an imported or saved student plan.
function PlannerPreview() {
  return <div className={s.productStage} data-reveal="soft" data-revealed="true" aria-hidden="true">
    <div className={s.stageReflection} />
    <div className={s.productWindow} data-parallax="-0.035">
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
    <div className={s.nextStepFloat} data-parallax="-0.1"><span className={s.floatIcon}><GitBranch size={24} /></span><span className={s.floatLabel}>Your next step</span><strong>Data structures</strong><span className={s.floatBody}>A foundation for the<br />courses ahead.</span><span className={s.floatFoot}>Offered in Terms 1 & 3 <ArrowUpRight size={13} /></span></div>
    <div className={s.finishFloat} data-parallax="-0.065"><div className={s.finishRing}><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" fill="none" stroke="#e5edf4" strokeWidth="5" /><circle cx="50" cy="50" r="43" fill="none" stroke="#648ebe" strokeWidth="5" strokeLinecap="round" strokeDasharray="215 270" transform="rotate(-90 50 50)" /></svg><span><GraduationCap size={27} /></span></div><strong>The finish is in view.</strong><span>Year 4 · Term 1</span><div><span><i /> 4 terms ahead</span><ArrowUpRight size={14} /></div></div>
  </div>;
}

export default function Landing({ onOpen, busy }: { onOpen: () => void; busy: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax-section]")).map(element => ({
      element, current: 0, target: 0, active: false,
      layers: Array.from(element.querySelectorAll<HTMLElement>("[data-parallax]")).map(layer => ({ element: layer, speed: Number(layer.dataset.parallax) })),
    }));
    let frame: number | null = null;
    let measure = true;
    let previousTime = 0;

    const tick = (time: number) => {
      frame = null;
      if (measure) {
        // Read section geometry together, before writing any layer styles.
        for (const section of sections) {
          const rect = section.element.getBoundingClientRect();
          section.active = rect.bottom > 0 && rect.top < window.innerHeight;
          section.target = section.element.dataset.parallaxSection === "hero"
            ? Math.max(0, Math.min(750, -rect.top))
            : Math.max(-320, Math.min(320, window.innerHeight / 2 - rect.top - rect.height / 2));
        }
        measure = false;
      }
      const blend = 1 - Math.exp(-Math.min(time - previousTime || 16, 50) / 85);
      previousTime = time;
      const strength = window.innerWidth <= 760 ? 0.35 : 1;
      let settling = false;
      for (const section of sections) {
        if (!section.active) continue;
        const difference = section.target - section.current;
        section.current = Math.abs(difference) < 0.2 ? section.target : section.current + difference * blend;
        settling ||= Math.abs(difference) >= 0.2;
        for (const layer of section.layers) {
          const offset = Math.max(-48, Math.min(48, section.current * layer.speed * strength));
          layer.element.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
        }
      }
      if (settling) frame = window.requestAnimationFrame(tick);
    };
    const schedule = () => {
      measure = true;
      if (frame === null) frame = window.requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      previousTime = 0;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete root.dataset.motion;
      sections.forEach(section => {
        section.current = 0;
        section.layers.forEach(layer => layer.element.style.removeProperty("--parallax-y"));
      });
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.revealed = "true";
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(element => observer.observe(element));
    const configure = () => {
      stop();
      if (preference.matches) return;
      root.dataset.motion = "ready";
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      schedule();
    };
    configure();
    preference.addEventListener("change", configure);
    return () => { stop(); observer.disconnect(); preference.removeEventListener("change", configure); };
  }, []);
  const steps = [
    { Icon: Upload, title: "Bring your curriculum", copy: "Open your exported JSON, saved OneMCL page, or a PathWise plan." },
    { Icon: Route, title: "See the connections", copy: "Find what you can take next, what it unlocks, and when it’s offered." },
    { Icon: SlidersHorizontal, title: "Find your pace", copy: "Compare course loads, try a change, and save the route that works for you." },
  ];
  return <div className={s.horizon} ref={rootRef}>
    <section className={s.hero} data-parallax-section="hero" aria-labelledby="landing-title">
      <div className={s.atmosphere} aria-hidden="true"><div className={s.skyLight} data-parallax="0.12" /><div className={s.horizonLight} data-parallax="0.07" /><div className={s.groundLight} /></div>
      <header className={s.floatingNav}><a href="#landing-title" aria-label="PathWise home"><Brand /></a><nav aria-label="Page navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Your privacy</a></nav><button onClick={onOpen} disabled={busy}>Open curriculum<ArrowUpRight size={13} /></button></header>
      <div className={s.heroCopy}>
        <span className={s.heroEyebrow} data-reveal="soft" data-revealed="true"><Route size={14} /> A clearer way through your degree</span>
        <h1 id="landing-title" data-reveal="heading" data-revealed="true"><HeadingLines lines={["Your degree.", "Coming into focus."]} /></h1>
        <p data-reveal="soft" data-revealed="true">See how your courses connect.<br />Find a route that works for what comes next.</p>
        <div className={s.heroActions} data-reveal="soft" data-revealed="true"><button className={s.pill} onClick={onOpen} disabled={busy}>{busy ? "Reading your file…" : "Open my curriculum"}<ArrowUpRight size={16} /></button><a href="#how-it-works">Take a closer look<ArrowDown size={14} /></a></div>
        <span className={s.privacyLine}><LockKeyhole size={11} /> No account. Your curriculum stays with you.</span>
        <p className={s.fileHint}>JSON, saved HTML, or a PathWise plan. You can also drop your file here.</p>
      </div>
      <PlannerPreview />
      <p className={s.stageCaption}>A glimpse of your bigger picture. Shown with fictional courses.</p>
    </section>
    <div className={s.capabilityLine}><span><GitBranch size={16} /> Connected prerequisites</span><span><Layers size={16} /> Offering terms in view</span><span><SlidersHorizontal size={16} /> A pace that works for you</span></div>
    <section id="how-it-works" className={s.focusSection} data-parallax-section="center" aria-labelledby="focus-title">
      <div className={s.focusCopy}><span className={s.sectionLabel} data-reveal="soft">MAKE ROOM FOR CLARITY</span><h2 id="focus-title" data-reveal="heading"><HeadingLines lines={["The next course.", "And everything", "it makes possible."]} /></h2><p data-reveal="soft">A curriculum is more than a list. See what’s ready to take, what it unlocks, and when it’s offered—together, in one clear view.</p><button onClick={onOpen} disabled={busy} className={s.textAction}>See your route<ArrowUpRight size={17} /></button></div>
      <div className={s.focusVisual} data-reveal="soft" aria-hidden="true"><div className={s.focusMain} data-parallax="0.035"><span className={s.focusIcon}><GitBranch size={25} /></span><span className={s.sectionLabel}>COURSE IN FOCUS</span><h3>Data structures</h3><p>CS201 / 3 units</p><div className={s.focusAvailability}><span><i /> When it’s available</span><strong>Terms 1 & 3</strong></div><div className={s.focusFollowing}><span>WHAT IT OPENS</span><div><span>Algorithms</span><ArrowRight size={14} /><span>Software studio</span><ArrowRight size={14} /><GraduationCap size={18} /></div></div></div><div className={s.focusNote} data-parallax="-0.075"><span className={s.noteMark}><Sparkles size={18} /></span><p>Small decisions.<br /><strong>A clearer path forward.</strong></p></div></div>
    </section>
    <section className={s.startSection} aria-labelledby="steps-title"><span className={s.sectionLabel} data-reveal="soft">FROM YOUR FILE TO YOUR FUTURE</span><h2 id="steps-title" data-reveal="heading"><HeadingLines lines={["A little perspective goes a long way."]} /></h2><div className={s.startSteps}>{steps.map(({Icon,title,copy},index) => <article key={title} data-reveal="soft"><span aria-hidden="true"><Icon size={23} /><small className={s.stepNumber}>0{index + 1}</small></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section id="privacy" className={s.privateSection} aria-labelledby="privacy-title"><span className={s.privateIcon} data-reveal="soft"><LockKeyhole size={23} /></span><h2 id="privacy-title" data-reveal="heading"><HeadingLines lines={["Your plans are personal.", "Let’s keep them that way."]} /></h2><p data-reveal="soft">Your curriculum is processed in your browser.<br />No account, no server upload, no extra hoops.</p><button className={s.pill} onClick={onOpen} disabled={busy}>Take the first step<ArrowUpRight size={16} /></button><p className={s.privateNote}>Download your plan or enable optional device autosave to keep it. Offering terms are inferred from your file; confirm schedules with your school.</p></section>
    <footer className={s.footer}><Brand /><span>A clearer way through.</span><a href="#landing-title">Back to top<ArrowUpRight size={13} /></a></footer>
  </div>;
}
