"use client";

import { useEffect, type RefObject } from "react";

const DESKTOP = "(min-width: 761px) and (prefers-reduced-motion: no-preference)";
const PHONE = "(max-width: 760px) and (prefers-reduced-motion: no-preference)";

/*
 * The landing's whole motion layer. GSAP and Lenis load lazily so the planner bundle stays as it was.
 * Content is complete without this hook: every scene's resting CSS state is its final state, and the
 * timelines only add the travel. Reduced motion matches neither query, so nothing moves or pins.
 * Everything is reverted on unmount, because opening a file replaces the landing with the workspace.
 */
export default function useLandingMotion(rootRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    let cleanup = () => {};

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis")]).then(([{ gsap }, { ScrollTrigger }, { default: Lenis }]) => {
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const q = gsap.utils.selector(root);
      const one = (selector: string) => q(selector)[0] as HTMLElement | undefined;
      const mm = gsap.matchMedia(root);

      mm.add({ desktop: DESKTOP, phone: PHONE }, context => {
        const { desktop } = context.conditions as { desktop: boolean };
        root.dataset.motion = "ready";

        // Smooth scrolling only for a mouse or trackpad; touch keeps native momentum.
        let lenis: InstanceType<typeof Lenis> | null = null;
        const raf = (time: number) => lenis?.raf(time * 1000);
        if (desktop && window.matchMedia("(pointer: fine)").matches) {
          lenis = new Lenis({ lerp: 0.12, anchors: { offset: -88 } });
          lenis.on("scroll", ScrollTrigger.update);
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);
        }

        // Hero: the copy lifts away while the tilted planner straightens and rises to fill the screen.
        // The intro plays in CSS; on desktop the stage is sticky rather than pinned, because a pin
        // re-parents the stage and the browser would restart that intro.
        const heroSection = one("[data-scene=hero]");
        const heroStage = one("[data-hero-stage]");
        const heroCopy = one("[data-hero-copy]");
        if (heroSection && heroStage && heroCopy) {
          const hero = gsap.timeline({ scrollTrigger: desktop
            ? { trigger: heroSection, start: "top top", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true }
            : { trigger: heroStage, start: "top top", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true } });
          hero.to(heroCopy, { y: () => -heroCopy.offsetHeight * 0.35, opacity: 0, ease: "none", duration: 0.55 }, 0)
            .to("[data-photo]", { scale: 1.14, yPercent: -5, ease: "none", duration: 1 }, 0);
          if (desktop) {
            hero.to("[data-product]", { y: () => -heroCopy.offsetHeight * 0.92, ease: "power2.out", duration: 1 }, 0)
              .fromTo("[data-window]", { rotateX: 16, rotateZ: 1.2, scale: 0.94 }, { rotateX: 0, rotateZ: 0, scale: 1.04, ease: "power2.out", duration: 1 }, 0)
              .to("[data-float=left]", { xPercent: -70, rotate: -10, opacity: 0, ease: "power1.in", duration: 0.6 }, 0.15)
              .to("[data-float=right]", { xPercent: 70, rotate: 10, opacity: 0, ease: "power1.in", duration: 0.6 }, 0.15);
          }
        }

        // Statement: each word fills in as the sentence passes through the screen.
        const statement = one("[data-scene=statement]");
        if (statement) gsap.fromTo(q("[data-word]"), { opacity: 0.18 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: statement, start: "top 72%", end: "bottom 62%", scrub: 0.5 } });

        // Chain: the prerequisite graph draws itself, one term at a time, while its caption follows.
        const chainStage = one("[data-chain-stage]");
        if (chainStage) {
          const link = (from: string) => q(`[data-link=${from}]`);
          const node = (code: string) => q(`[data-node=${code}]`);
          const steps = q("[data-step]");
          const chain = gsap.timeline({ scrollTrigger: desktop
            ? { trigger: chainStage, start: "top top+=72", end: "+=150%", scrub: 0.6, pin: true, anticipatePin: 1 }
            : { trigger: one("[data-graph]") ?? chainStage, start: "top 80%", end: "bottom 45%", scrub: 0.6 } });
          gsap.set(q("[data-link]"), { strokeDasharray: 1, strokeDashoffset: 1 });
          gsap.set(steps, { color: "var(--muted)" });
          chain.from([...node("CS201"), ...node("MA202")], { opacity: 0, y: 14, scale: 0.94, stagger: 0.08, duration: 0.4 })
            .to(steps[0], { color: "var(--ink)", duration: 0.2 }, "<")
            .to([...link("CS201"), ...link("MA202")], { strokeDashoffset: 0, duration: 0.6, ease: "none" })
            .from([...node("CS301"), ...node("CS305")], { opacity: 0, y: 14, scale: 0.94, stagger: 0.08, duration: 0.4 }, "-=0.15")
            .to(steps[0], { color: "var(--muted)", duration: 0.2 })
            .to(steps[1], { color: "var(--ink)", duration: 0.2 }, "<")
            .to([...link("CS301"), ...link("CS305")], { strokeDashoffset: 0, duration: 0.6, ease: "none" })
            .from(node("CS350"), { opacity: 0, y: 14, scale: 0.94, duration: 0.4 }, "-=0.15")
            .to(steps[1], { color: "var(--muted)", duration: 0.2 })
            .to(steps[2], { color: "var(--ink)", duration: 0.2 }, "<")
            .to(link("CS350"), { strokeDashoffset: 0, duration: 0.5, ease: "none" })
            .from(node("CS499"), { opacity: 0, y: 14, scale: 0.94, duration: 0.4 }, "-=0.1")
            .to({}, { duration: 0.3 });
        }

        // Window: the once-a-year course is tried in Term 2, flagged, then moved into its window.
        const windowStage = one("[data-window-stage]");
        const card = one("[data-term-card]");
        if (windowStage && card) {
          // On phones the card sits above the columns, so it only settles in place.
          const step = () => { const column = q("[data-term-column]")[1] as HTMLElement | undefined; return desktop && column ? column.offsetLeft : 0; };
          const scene = gsap.timeline({ scrollTrigger: desktop
            ? { trigger: windowStage, start: "top top+=72", end: "+=110%", scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true }
            : { trigger: card, start: "top 85%", end: "top 35%", scrub: 0.6, invalidateOnRefresh: true } });
          scene.fromTo(card, { x: step, y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 })
            .fromTo("[data-status=wait]", { opacity: 0 }, { opacity: 1, duration: 0.2 }, "<")
            .fromTo("[data-status=ok]", { opacity: 0 }, { opacity: 0, duration: 0.01 }, "<")
            .to("[data-term-column]:nth-of-type(2)", { "--warn": 1, duration: 0.2 }, "<")
            .to({}, { duration: 0.3 })
            .to(card, { x: 0, duration: 0.6, ease: "power2.inOut" })
            .to("[data-term-column]:nth-of-type(2)", { "--warn": 0, duration: 0.2 }, "<")
            .to("[data-status=wait]", { opacity: 0, duration: 0.2 }, "-=0.25")
            .to("[data-status=ok]", { opacity: 1, duration: 0.25 }, "<0.1")
            .to({}, { duration: 0.3 });
        }

        // Every other section: its parts rise in once, staggered, as they arrive.
        const entering = q("[data-enter]");
        gsap.set(entering, { y: 28, opacity: 0 });
        ScrollTrigger.batch(entering, { start: "top 88%", once: true, onEnter: batch => gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09, ease: "power3.out", overwrite: true }) });

        return () => {
          gsap.ticker.remove(raf);
          gsap.ticker.lagSmoothing(500, 33);
          lenis?.destroy();
          delete root.dataset.motion;
        };
      });

      cleanup = () => mm.revert();
    });

    return () => { disposed = true; cleanup(); };
  }, [rootRef]);
}
