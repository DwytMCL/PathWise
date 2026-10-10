"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, GitBranch, GraduationCap, Layers, LockKeyhole, Route, SlidersHorizontal, Upload } from "lucide-react";
import s from "./Landing.module.css";

function Brand() {
  return <Image src="/pathwise-logo.svg" width={150} height={38} alt="PathWise" className={s.brand} />;
}

function HeadingLines({ lines }: { lines: string[] }) {
  return lines.map((line, index) => <span className={s.revealLine} key={line}><span>{line}{index < lines.length - 1 ? " " : ""}</span></span>);
}

// A decorative preview using fictional courses, never the student workspace.
function PlannerPreview() {
  return <figure className={s.productStage} aria-labelledby="example-caption">
    <div className={s.stageReflection} aria-hidden="true" />
    <div className={s.productWindow} data-parallax="-0.035">
      <div className={s.windowChrome}><span className={s.windowDots}><i /><i /><i /></span><span><LockKeyhole size={10} /> PathWise / My route</span><span className={s.windowAction}><ArrowUpRight size={12} /></span></div>
      <div className={s.windowContent}>
        <div className={s.windowRail} aria-hidden="true"><Brand /><div className={s.miniProgram}><GraduationCap size={17} /><span>Computer science<small>Example curriculum</small></span></div><div className={s.miniNav}><span><Route size={14} /> My route</span><span><Layers size={14} /> Term board</span><span><GitBranch size={14} /> Requirements</span></div><span className={s.miniPrivacy}><LockKeyhole size={11} /> Private on your device</span></div>
        <div className={s.windowPlan}>
          <div className={s.miniHeading}><div><small>YOUR WAY FORWARD</small><h2>A plan you can see.</h2></div><span><Check size={10} /> Ready to explore</span></div>
          <div className={s.miniForecast}><span><small>Projected finish</small><strong>Year 4 · Term 1</strong></span><span><strong>4</strong><small>terms ahead</small></span><span><strong>33</strong><small>units left</small></span></div>
          <div className={s.miniTerm}><strong>Year 3 · Term 1</strong><span>Up next / 9 units</span></div>
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
    <div className={s.finishFloat} data-parallax="-0.065"><div className={s.finishRing} aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="43" fill="none" stroke="#e5edf4" strokeWidth="5" /><circle cx="50" cy="50" r="43" fill="none" stroke="#648ebe" strokeWidth="5" strokeLinecap="round" strokeDasharray="215 270" transform="rotate(-90 50 50)" /></svg><span><GraduationCap size={27} /></span></div><strong>The finish is in view.</strong><span>Year 4 · Term 1</span><div><span><i /> 4 terms ahead</span><ArrowUpRight size={14} /></div></div>
    <figcaption id="example-caption">A glimpse of your bigger picture. Shown with fictional courses.</figcaption>
  </figure>;
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
    { Icon: Upload, title: "Open your curriculum", copy: "Bring your exported JSON, saved HTML page or PathWise plan." },
    { Icon: SlidersHorizontal, title: "Make it yours", copy: "Confirm your progress, starting term and a workload that fits." },
    { Icon: Route, title: "See your way through", copy: "Explore the route, try a change and keep the plan that works for you." },
  ];
  return <div className={s.horizon} ref={rootRef}>
    <section className={s.hero} data-parallax-section="hero" aria-labelledby="landing-title">
      <div className={s.atmosphere} aria-hidden="true"><div className={s.landscape} data-parallax="0.055">
        {/* Responsive local derivatives retain the original photograph and avoid a full-size download. */}
        <picture><source media="(max-width: 760px)" srcSet="/images/blue-horizon-mobile.webp" /><img src="/images/blue-horizon-1920.webp" srcSet="/images/blue-horizon-960.webp 960w, /images/blue-horizon-1920.webp 1920w, /images/blue-horizon-3840.webp 3840w" sizes="100vw" alt="" width={1920} height={889} fetchPriority="high" /></picture>
      </div></div>
      <header className={s.floatingNav}><a href="#landing-title" aria-label="PathWise home"><Brand /></a><nav aria-label="Page navigation"><a href="#how-it-works">How it works</a><a href="#privacy">Your privacy</a></nav><button onClick={onOpen} disabled={busy}>Open curriculum<ArrowUpRight size={15} /></button></header>
      <div className={s.heroCopy}>
        <span className={s.heroEyebrow} data-reveal="soft" data-revealed="true"><span /> A little clarity. A world of possibility.</span>
        <h1 id="landing-title" data-reveal="heading" data-revealed="true"><HeadingLines lines={["Your degree.", "A clearer way through."]} /></h1>
        <p>Plan your remaining courses around prerequisites,<br className={s.desktopBreak} /> offering terms, and a workload that fits.</p>
        <div className={s.heroActions}><button className={s.pill} onClick={onOpen} disabled={busy}>{busy ? "Reading your file…" : "Open my curriculum"}<ArrowUpRight size={18} /></button><a href="#how-it-works">Take a closer look<ArrowDown size={15} /></a></div>
        <span className={s.privacyLine}><LockKeyhole size={13} /> No account. Your curriculum stays in your browser.</span>
        <span className={s.fileHint}>JSON · Saved HTML · PathWise plan</span>
      </div>
      <PlannerPreview />
    </section>
    <div className={s.capabilityLine}><span><GitBranch size={18} /> See the connections</span><span><Layers size={18} /> Find the right term</span><span><SlidersHorizontal size={18} /> Choose your pace</span></div>
    <section id="how-it-works" className={s.focusSection} aria-labelledby="focus-title">
      <div className={s.featureCopy} data-reveal="soft"><span className={s.sectionLabel}>01 / THE CONNECTIONS</span><h2 id="focus-title">One course.<br /><span>Everything it opens.</span></h2><p>A small decision can shape the terms ahead. See the requirements behind each course, and understand why your next step matters.</p><button onClick={onOpen} disabled={busy} className={s.textAction}>Find your next step<ArrowUpRight size={17} /></button></div>
      <div className={s.connectionVisual} data-reveal="soft"><span className={s.specimenLabel}>A closer look · Fictional courses</span><div className={s.selectedCourse}><span className={s.courseGlyph}><GitBranch size={25} /></span><div><span className={s.sectionLabel}>COURSE IN FOCUS</span><h3>Applied Mathematics</h3><p>MAT102 · 3 units</p></div><Check size={17} /></div><div className={s.connectionLine} aria-hidden="true" /><div className={s.followingCourses}><span>Later in this prerequisite chain</span><div><span className={s.routeDot} /><div><h3>Systems Analysis</h3><p>SCI201 · Requires MAT102</p></div><ArrowDown size={17} /></div><div><span className={s.routeDot} /><div><h3>Final Project</h3><p>PRJ301 · Requires SCI201</p></div><GraduationCap size={20} /></div></div><p className={s.specimenFootnote}>See each course’s full requirements before planning its place.</p></div>
    </section>
    <section className={s.offeringSection} aria-labelledby="offering-title">
      <div className={s.offeringVisual} data-reveal="soft"><div className={s.offeringHeader}><Layers size={20} /><strong>Find its window.</strong><span>Annual offerings</span></div><div className={s.termStrip}><span>Term 1</span><span className={s.offeredTerm}>Term 2 <Check size={14} /></span><span>Term 3</span></div><div className={s.offeringCourse}><span className={s.sectionLabel}>APPLIED MATHEMATICS</span><h3>A place in your plan.</h3><dl><div><dt>Offered each year</dt><dd>Term 2</dd></div><div><dt>Planned for</dt><dd>Year 2 · Term 2</dd></div></dl><span className={s.offeringSource}>Inferred from the example curriculum</span></div><p className={s.specimenFootnote}>Fictional example · Confirm offerings with your school.</p></div>
      <div className={s.featureCopy} data-reveal="soft"><span className={s.sectionLabel}>02 / THE TIMING</span><h2 id="offering-title">The right course.<br /><span>The right term.</span></h2><p>Some courses only come around once a year. Bring those windows into view, then compare a pace that works for your life.</p><p className={s.supportingCopy}>Your route considers course offerings, requirements and your unit limit together. You can review and change the assumptions.</p><button onClick={onOpen} disabled={busy} className={s.textAction}>Make room for your plans<ArrowUpRight size={17} /></button></div>
    </section>
    <section className={s.startSection} aria-labelledby="steps-title"><div data-reveal="soft"><span className={s.sectionLabel}>YOUR NEXT CHAPTER</span><h2 id="steps-title">From your file<br /><span>to a clearer plan.</span></h2></div><div className={s.startSteps}>{steps.map(({Icon,title,copy},index) => <article key={title} data-reveal="soft"><span className={s.stepNumber}>0{index+1}<Icon size={22} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section id="privacy" className={s.privateSection} aria-labelledby="privacy-title"><div className={s.privateCopy} data-reveal="soft"><span className={s.privateIcon}><LockKeyhole size={23} /></span><span className={s.sectionLabel}>YOUR FILE. YOUR DEVICE. YOUR FUTURE.</span><h2 id="privacy-title">Your plans are personal.<br /><span>Let’s keep them that way.</span></h2><p>Processed in your browser. Save a portable copy,<br className={s.desktopBreak} /> or choose device autosave to pick up where you left off.</p><button className={s.pill} onClick={onOpen} disabled={busy}>Open my curriculum<ArrowUpRight size={18} /></button><span className={s.privateNote}>No account needed. No curriculum upload.</span></div></section>
    <footer className={s.footer}><Brand /><span>A clearer way through.</span><a className={s.photoCredit} href="https://unsplash.com/photos/silhouette-of-mountains-covered-by-fogs-at-the-horizon-JV78PVf3gGI" target="_blank" rel="noreferrer">Photography by Sergey Pesterev<ArrowUpRight size={12} /></a><a href="#landing-title">Back to top<ArrowUpRight size={14} /></a></footer>
  </div>;
}
