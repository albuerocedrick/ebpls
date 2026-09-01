/**
 * gsap.js
 * Single registration point for GSAP and its plugins.
 *
 * Import GSAP from here (never from "gsap" directly) so plugins are
 * registered exactly once, before any timeline is built.
 *
 * Plugins in use:
 *   ScrollTrigger   — scroll-linked reveals and scrubbed parallax
 *   ScrollToPlugin  — programmatic scrolling (fallback when Lenis is absent)
 *   SplitText       — per-line masked headline reveals
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, SplitText);

// Project-wide motion defaults; individual tweens may override them.
gsap.defaults({ ease: "power3.out", duration: 0.8 });

export { gsap, ScrollTrigger, ScrollToPlugin, SplitText };