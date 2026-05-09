import Lenis from "lenis";
import { ScrollTrigger } from "./gsap";

export function initLenis() {
  const lenis = new Lenis({
    smooth: true,
    lerp: 0.08,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);

  // ✅ ONLY this is needed
  lenis.on("scroll", ScrollTrigger.update);

  // ✅ refresh after setup
  ScrollTrigger.refresh();
}