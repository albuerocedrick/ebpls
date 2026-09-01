/**
 * animations.js
 * Reusable GSAP motion primitives for the public landing page.
 *
 * Every helper here is safe to call inside a `gsap.context()` and:
 *   - respects `prefers-reduced-motion` (elements are left visible, no motion)
 *   - returns a cleanup function where it allocates something GSAP cannot
 *     revert on its own (e.g. a SplitText instance)
 *
 * Keeping these in one module means the landing sections share the same
 * easing, distance, and stagger values instead of drifting apart.
 */
import { gsap, SplitText } from "./gsap";

/** Shared motion language for the landing page. */
export const EASE = "power3.out";
export const EASE_SOFT = "power2.out";
/** Long-tailed ease used for masked text rolls — fast out, slow settle. */
export const EASE_ROLL = "expo.out";

/**
 * True when the visitor has asked the OS to reduce animation.
 * Guarded for SSR/non-browser execution.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Wait until webfonts are ready before measuring text.
 * SplitText computes line boxes from rendered glyphs, so splitting before
 * Geist loads produces line breaks in the wrong places.
 *
 * @returns {Promise<void>}
 */
export function whenFontsReady() {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return document.fonts.ready.then(() => undefined);
}

/**
 * Reveal a heading line by line from behind a clipping mask.
 *
 * @param {HTMLElement} element      Heading element to split.
 * @param {object}      [options]
 * @param {number}      [options.delay]    Start delay in seconds.
 * @param {number}      [options.stagger]  Gap between lines in seconds.
 * @param {number}      [options.duration] Per-line duration in seconds.
 * @param {object}      [options.scrollTrigger] ScrollTrigger vars; omit to play immediately.
 * @returns {() => void} Cleanup that reverts the split back to plain text.
 */
export function revealLines(element, options = {}) {
  if (!element) return () => {};

  const { delay = 0, stagger = 0.12, duration = 1, scrollTrigger } = options;

  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1 });
    return () => {};
  }

  // The element carries `.will-reveal` (opacity 0) in markup so it cannot flash
  // before this runs. Masking hides the lines from here on, so it is safe to
  // make the element itself visible.
  gsap.set(element, { opacity: 1 });

  const split = SplitText.create(element, {
    type: "lines",
    mask: "lines",
    linesClass: "reveal-line",
    autoSplit: true,
    onSplit: (self) =>
      gsap.fromTo(
        self.lines,
        { yPercent: 115 },
        {
          yPercent: 0,
          duration,
          delay,
          stagger,
          ease: EASE_ROLL,
          ...(scrollTrigger ? { scrollTrigger } : {}),
        },
      ),
  });

  return () => split.revert();
}

/**
 * Fade a group of elements up into place, one after another.
 *
 * @param {HTMLElement|HTMLElement[]|NodeList} targets
 * @param {object} [options]
 * @param {number} [options.y]        Travel distance in px.
 * @param {number} [options.delay]
 * @param {number} [options.stagger]
 * @param {number} [options.duration]
 * @param {object} [options.scrollTrigger]
 * @returns {gsap.core.Tween|undefined}
 */
export function revealStagger(targets, options = {}) {
  const items = gsap.utils.toArray(targets);
  if (!items.length) return undefined;

  const {
    y = 24,
    delay = 0,
    stagger = 0.09,
    duration = 0.8,
    scrollTrigger,
  } = options;

  if (prefersReducedMotion()) {
    gsap.set(items, { y: 0, opacity: 1, clearProps: "transform" });
    return undefined;
  }

  return gsap.fromTo(
    items,
    { y, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration,
      delay,
      stagger,
      ease: EASE,
      ...(scrollTrigger ? { scrollTrigger } : {}),
    },
  );
}

/**
 * Lift an element slightly slower than the page while its section is in view.
 *
 * This is the depth-of-field cue that makes the page feel layered: section
 * copy rises a few pixels ahead of the content beside it. Distances are kept
 * small (px, not percent) so text never separates from the block it belongs to.
 *
 * @param {HTMLElement|HTMLElement[]|NodeList} targets
 * @param {object} [options]
 * @param {HTMLElement} [options.trigger]   Section that owns the scroll range.
 * @param {number}      [options.distance]  Upward travel in px across the range.
 * @returns {gsap.core.Tween|undefined}
 */
export function drift(targets, options = {}) {
  const items = gsap.utils.toArray(targets);
  if (!items.length || prefersReducedMotion()) return undefined;

  const { trigger = items[0], distance = 40 } = options;

  return gsap.to(items, {
    y: -distance,
    ease: "none",
    scrollTrigger: {
      trigger,
      start: "top bottom",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
}

/**
 * Uncover an image from behind a clip-path wipe, settling out of a slight zoom.
 *
 * Clip-path is used instead of opacity so the image never looks washed out
 * mid-reveal — it reads as a curtain opening, which suits editorial imagery.
 *
 * @param {HTMLElement} element
 * @param {object} [options]
 * @param {HTMLElement} [options.trigger]
 * @param {number}      [options.duration]
 * @param {number}      [options.delay]
 * @returns {gsap.core.Tween|undefined}
 */
export function imageReveal(element, options = {}) {
  if (!element) return undefined;

  const { trigger = element, duration = 1.4, delay = 0 } = options;

  if (prefersReducedMotion()) {
    gsap.set(element, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, opacity: 1 });
    return undefined;
  }

  return gsap.fromTo(
    element,
    { clipPath: "inset(0% 0% 100% 0%)", scale: 1.08, opacity: 1 },
    {
      clipPath: "inset(0% 0% 0% 0%)",
      scale: 1,
      duration,
      delay,
      ease: EASE_ROLL,
      scrollTrigger: {
        trigger,
        start: "top 85%",
        once: true,
      },
    },
  );
}

/**
 * Draw a hairline rule open from its leading edge as it scrolls into view.
 * Applied to section dividers so the page assembles itself line by line, and
 * to vertical rails (`axis: "y"`) that connect a sequence of steps.
 *
 * The element must carry the matching CSS transform-origin (`left center` for
 * the x axis, `top center` for the y axis) and start at scale 0 in markup, so
 * it is never briefly drawn before this runs.
 *
 * @param {HTMLElement|HTMLElement[]|NodeList} targets
 * @param {object} [options]
 * @param {HTMLElement}    [options.trigger]
 * @param {number}         [options.stagger]
 * @param {"x"|"y"}        [options.axis]    Direction to draw. Defaults to "x".
 * @param {boolean|number} [options.scrub]   Tie progress to scroll position.
 * @returns {gsap.core.Tween|undefined}
 */
export function drawLine(targets, options = {}) {
  const items = gsap.utils.toArray(targets);
  if (!items.length) return undefined;

  const { trigger, stagger = 0.08, axis = "x", scrub = false } = options;
  const prop = axis === "y" ? "scaleY" : "scaleX";

  if (prefersReducedMotion()) {
    gsap.set(items, { [prop]: 1 });
    return undefined;
  }

  return gsap.fromTo(
    items,
    { [prop]: 0 },
    {
      [prop]: 1,
      duration: 1.1,
      stagger,
      // A scrubbed rule is positional, not a gesture, so it must stay linear —
      // an eased scrub would drift out of step with the content beside it.
      ease: scrub ? "none" : "power2.inOut",
      ...(trigger
        ? {
            scrollTrigger: scrub
              ? {
                  trigger,
                  start: "top 78%",
                  end: "bottom 65%",
                  scrub: scrub === true ? 0.4 : scrub,
                  invalidateOnRefresh: true,
                }
              : {
                  trigger,
                  start: "top 82%",
                  once: true,
                },
          }
        : {}),
    },
  );
}

/**
 * Scale a bar from 0 to 1 across the full document scroll range.
 * Used for the reading-progress hairline under the sticky header.
 *
 * @param {HTMLElement} element
 * @returns {gsap.core.Tween|undefined}
 */
export function scrollProgress(element) {
  if (!element) return undefined;

  return gsap.fromTo(
    element,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        start: 0,
        end: "max",
        // A short catch-up scrub keeps the bar smooth under Lenis instead of
        // stepping with each wheel event.
        scrub: prefersReducedMotion() ? true : 0.3,
        invalidateOnRefresh: true,
      },
    },
  );
}

/**
 * Track the pointer over a group of cards and write the position into CSS
 * custom properties, which `.spotlight::before` renders as a soft highlight.
 *
 * A single delegated listener on the container is used rather than one per
 * card, so adding cards never adds listeners.
 *
 * @param {HTMLElement} container  Element that contains the cards.
 * @param {string} [selector]      Card selector, defaults to `.spotlight`.
 * @returns {() => void} Cleanup that removes the listener.
 */
export function attachSpotlight(container, selector = ".spotlight") {
  if (!container || prefersReducedMotion()) return () => {};

  const onMove = (event) => {
    const card = event.target.closest?.(selector);
    if (!card || !container.contains(card)) return;

    const rect = card.getBoundingClientRect();
    gsap.set(card, {
      "--spot-x": `${event.clientX - rect.left}px`,
      "--spot-y": `${event.clientY - rect.top}px`,
    });
  };

  container.addEventListener("pointermove", onMove);
  return () => container.removeEventListener("pointermove", onMove);
}

/**
 * Restore a `countUp` element to its original label.
 * Call this on unmount: the tween writes `textContent`, which GSAP's
 * `context.revert()` cannot undo, so a killed tween would otherwise leave a
 * partial number (e.g. "0+") on screen.
 *
 * @param {HTMLElement} element
 */
export function resetCountUp(element) {
  if (!element) return;
  const original = element.dataset.countFrom;
  if (original !== undefined) element.textContent = original;
}

/**
 * Count a numeric label up to its final value.
 * Non-numeric parts of the label (commas, "+", "hrs") are preserved.
 *
 * The original label is cached on the element the first time it is seen. This
 * matters because the function rewrites `textContent`, which GSAP cannot
 * revert — without the cache, React StrictMode's double effect invocation
 * would re-read the already-zeroed text and count up to 0.
 *
 * @param {HTMLElement} element  Element whose text holds the target value.
 * @param {object} [options]
 * @param {object} [options.scrollTrigger]
 * @returns {gsap.core.Tween|undefined}
 */
export function countUp(element, options = {}) {
  if (!element) return undefined;

  const raw = element.dataset.countFrom ?? element.textContent ?? "";
  element.dataset.countFrom = raw;

  const match = raw.match(/[\d,]+/);
  if (!match) return undefined;

  const target = Number(match[0].replace(/,/g, ""));
  if (!Number.isFinite(target)) return undefined;

  const grouped = match[0].includes(",");
  const render = (value) => {
    const rounded = Math.round(value);
    const text = grouped ? rounded.toLocaleString("en-US") : String(rounded);
    element.textContent = raw.replace(match[0], text);
  };

  if (prefersReducedMotion()) {
    render(target);
    return undefined;
  }

  const counter = { value: 0 };
  render(0);

  return gsap.to(counter, {
    value: target,
    duration: 1.6,
    ease: EASE_SOFT,
    onUpdate: () => render(counter.value),
    // Restore the exact original label so repeated mounts stay consistent.
    onComplete: () => {
      element.textContent = raw;
    },
    ...(options.scrollTrigger ? { scrollTrigger: options.scrollTrigger } : {}),
  });
}
