/**
 * lenis.jsx
 * Smooth-scroll provider built on Lenis and synchronised with GSAP.
 *
 * Responsibilities:
 *   - drive Lenis from the GSAP ticker so ScrollTrigger and Lenis share one clock
 *   - expose the live Lenis instance through context for programmatic scrolling
 *   - disable smoothing entirely when the visitor prefers reduced motion
 *   - refresh ScrollTrigger once fonts/images settle so triggers measure correctly
 *
 * The context and hooks live in ./lenisContext.js; import `useScrollTo` and
 * `useLenisRef` from there.
 */
import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { prefersReducedMotion } from './animations';
import { LenisContext } from './lenisContext';

/**
 * Creates and owns the Lenis instance for its subtree.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function LenisWrapper({ children }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Reduced motion: skip Lenis entirely and let the browser scroll natively.
    if (prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return undefined;
    }

    const instance = new Lenis({
      duration: 1.15,
      // Exponential ease-out: quick to respond, long to settle.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      // Let Lenis animate in-page #hash links instead of jumping. Matches
      // HEADER_OFFSET in L-navbar so a hash URL and a nav click land alike.
      anchors: { offset: -64 },
    });

    // One clock for both libraries: Lenis advances on GSAP's ticker, and
    // ScrollTrigger recalculates on every Lenis scroll event.
    instance.on('scroll', ScrollTrigger.update);

    const advance = (time) => instance.raf(time * 1000);
    gsap.ticker.add(advance);
    gsap.ticker.lagSmoothing(0);

    lenisRef.current = instance;

    // Late-loading webfonts and images change element heights, which invalidates
    // every ScrollTrigger start/end. Re-measure once they have settled.
    const refresh = () => ScrollTrigger.refresh();
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    let cancelled = false;
    fontsReady.then(() => {
      if (!cancelled) refresh();
    });
    window.addEventListener('load', refresh);

    return () => {
      cancelled = true;
      window.removeEventListener('load', refresh);
      gsap.ticker.remove(advance);
      instance.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <LenisContext.Provider value={lenisRef}>
      <div className="lenis-container">{children}</div>
    </LenisContext.Provider>
  );
}
