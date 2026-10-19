"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight, Check, FileCode2, FileJson, FileText, GraduationCap, LockKeyhole, Upload } from "lucide-react";
import ChainGraph from "./ChainGraph";
import PacePlanner from "./PacePlanner";
import ProductWindow from "./ProductWindow";
import TermWindow from "./TermWindow";
import useLandingMotion from "./useLandingMotion";
import { START_TERM } from "./example";
import s from "./Landing.module.css";

function Brand({ className }: { className?: string }) {
  return <Image src="/pathwise-logo.svg" width={150} height={38} alt="PathWise" className={className ?? s.brand} translate="no" />;
}

function Words({ text }: { text: string }) {
  return text.split(" ").map((word, i) => <span key={i} data-word>{word} </span>);
}

const chainSteps = [
  "Data structures opens Algorithms and Databases.",
  "Both lead into Software studio.",
  "And all of it ends at your Capstone project.",
];

export default function Landing({ onOpen, busy }: { onOpen: () => void; busy: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useLandingMotion(rootRef);
  // The sticky nav can open a file from deep in the page; the workspace that replaces it starts at the top.
  useEffect(() => () => window.scrollTo(0, 0), []);
  const openLabel = busy ? "Reading your file…" : "Open my curriculum";
  return <div className={s.landing} ref={rootRef}>
    <a className={s.skip} href="#landing-title">Skip to content</a>
    <header className={s.nav}>
      <a href="#landing-title" aria-label="PathWise, back to top"><Brand /></a>
      <nav aria-label="Page sections"><a href="#how-it-works">How it works</a><a href="#pace">Your pace</a><a href="#privacy">Privacy</a></nav>
      <button onClick={onOpen} disabled={busy}>{busy ? "Reading…" : "Open curriculum"}<ArrowUpRight size={15} /></button>
    </header>

    <section className={s.hero} data-scene="hero" aria-labelledby="landing-title">
      <div className={s.heroStage} data-hero-stage>
        <div className={s.sky} aria-hidden="true"><div className={s.photo} data-photo>
          {/* Responsive local derivatives retain the original photograph and avoid a full-size download. */}
          <picture><source media="(max-width: 760px)" srcSet="/images/blue-horizon-mobile.webp" /><img src="/images/blue-horizon-1920.webp" srcSet="/images/blue-horizon-960.webp 960w, /images/blue-horizon-1920.webp 1920w, /images/blue-horizon-3840.webp 3840w" sizes="100vw" alt="" width={1920} height={889} fetchPriority="high" /></picture>
        </div></div>
        <div className={s.heroCopy} data-hero-copy>
          <h1 id="landing-title" tabIndex={-1}><span className={s.line}><span>Your degree.</span></span><span className={s.line}><span>In clear view.</span></span></h1>
          <p>Plan every remaining course around prerequisites, once-a-year offerings and a workload that fits.</p>
          <div className={s.heroActions}>
            <button className={s.primary} onClick={onOpen} disabled={busy}>{openLabel}<ArrowUpRight size={18} /></button>
            <a href="#how-it-works">See how it works<ArrowDown size={15} /></a>
          </div>
          <span className={s.heroNote}><LockKeyhole size={14} /> No account. Your curriculum stays in your browser.</span>
        </div>
        <ProductWindow />
      </div>
    </section>

    <section className={s.statement} data-scene="statement" aria-labelledby="statement-title">
      <h2 id="statement-title">Small choices.<br /><span>Big dates.</span></h2>
      <p className={s.statementText}><Words text="Every course waits on another. Some come only once a year. One late choice can quietly move your finish." /></p>
      <p className={s.statementCoda} data-enter>PathWise lays it all out, term by term, so you see it before it happens.</p>
    </section>

    <section id="how-it-works" className={s.chain} data-scene="chain" aria-labelledby="chain-title">
      <div className={s.sceneStage} data-chain-stage>
        <div className={s.sceneCopy}>
          <h2 id="chain-title">One course.<br /><span>Everything it opens.</span></h2>
          <ol className={s.chainSteps}>{chainSteps.map(step => <li key={step} data-step>{step}</li>)}</ol>
          <p>See the requirements behind every course before you choose its term.</p>
        </div>
        <ChainGraph />
      </div>
    </section>

    <section className={s.offerings} data-scene="window" aria-labelledby="window-title">
      <div className={s.sceneStage} data-window-stage>
        <div className={s.sceneCopy}>
          <h2 id="window-title">The right course.<br /><span>The right term.</span></h2>
          <p>Computer systems runs in Term 1 only. Plan it anywhere else and you wait a year. PathWise keeps each course inside its window.</p>
          <p className={s.aside}>Offering terms are inferred from your file. You can review and change them.</p>
        </div>
        <TermWindow />
      </div>
    </section>

    <section id="pace" className={s.paceSection} aria-labelledby="pace-title">
      <div className={s.sectionHead} data-enter>
        <h2 id="pace-title">Your pace.<br /><span>Your finish.</span></h2>
        <p>Choose how many units you can carry each term. The route rebuilds around it, prerequisites and all.</p>
      </div>
      <div data-enter><PacePlanner /></div>
    </section>

    <section className={s.steps} aria-labelledby="steps-title">
      <div className={s.sectionHead} data-enter><h2 id="steps-title">From your file<br /><span>to a clearer plan.</span></h2></div>
      <ol className={s.stepList}>
        <li data-enter>
          <h3>Open your curriculum</h3><p>Bring the JSON export, a saved OneMCL page or a PathWise plan you saved before.</p>
          <div className={s.stepVisual} data-ui aria-hidden="true"><span className={s.fileChip}><FileJson size={18} /> curriculum.json</span><span className={s.fileChip}><FileCode2 size={18} /> OneMCL page.html</span><span className={s.fileChip}><FileText size={18} /> my-plan.pathwise.json</span></div>
        </li>
        <li data-enter>
          <h3>Make it yours</h3><p>Confirm your progress, your starting term and a workload that fits your life.</p>
          <div className={s.stepVisual} data-ui aria-hidden="true"><span className={s.settingRow}><small>Starting term</small><strong>{START_TERM}</strong></span><span className={s.settingRow}><small>Unit limit</small><strong>18 units</strong></span><span className={s.settingRow}><small>Completed</small><strong><Check size={14} /> 24 courses</strong></span></div>
        </li>
        <li data-enter>
          <h3>See your way through</h3><p>Explore the route, try a change, and keep the plan that works for you.</p>
          <div className={s.stepVisual} data-ui aria-hidden="true"><span className={s.miniRoute}>{[18, 18, 15, 15].map((units, i) => <span key={i} style={{ height: `${units * 4}px` }} />)}</span><span className={s.finishTag}><GraduationCap size={16} /> Year 4 · Term 1</span></div>
        </li>
      </ol>
    </section>

    <section id="privacy" className={s.privacy} aria-labelledby="privacy-title">
      <div className={s.privacyPhoto} aria-hidden="true"><picture><img src="/images/blue-horizon-1920.webp" srcSet="/images/blue-horizon-960.webp 960w, /images/blue-horizon-1920.webp 1920w" sizes="100vw" alt="" width={1920} height={889} loading="lazy" /></picture></div>
      <div className={s.privacyInner} data-enter>
        <h2 id="privacy-title">Your plans.<br /><span>Your device.</span></h2>
        <p>Your file is read in your browser and never uploaded. Save a portable copy, or turn on device autosave to pick up where you left off.</p>
        <ul className={s.privacyFacts}><li><Check size={16} /> No account</li><li><Check size={16} /> No upload</li><li><Upload size={16} /> Your own saved file</li></ul>
        <button className={s.primaryLight} onClick={onOpen} disabled={busy}>{openLabel}<ArrowUpRight size={18} /></button>
      </div>
    </section>

    <footer className={s.footer}>
      <Brand className={s.footerBrand} />
      <span>A clearer way through.</span>
      <a className={s.credit} href="https://unsplash.com/photos/silhouette-of-mountains-covered-by-fogs-at-the-horizon-JV78PVf3gGI" target="_blank" rel="noreferrer">Photograph by Sergey Pesterev<ArrowUpRight size={13} /></a>
      <a href="#landing-title">Back to top<ArrowUpRight size={14} /></a>
    </footer>
  </div>;
}
