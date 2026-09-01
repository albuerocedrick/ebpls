/**
 * Hero.jsx
 * Opening block of the public landing page.
 *
 * Design intent: the municipal hall photograph carries the whole section as a
 * full-bleed background, so the page opens with a sense of place and needs no
 * decorative colour of its own. Everything on top is white-on-dark neutral —
 * one solid CTA, one ghost CTA, one input — which keeps the composition
 * minimal and leaves the photograph as the only visual interest.
 *
 * No accent hue is used here. On a photographic backdrop a saturated button
 * fights the image; a white button reads as the clear primary action and stays
 * inside the neutral palette.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";

import { gsap } from "../../lib/gsap";
import {
  prefersReducedMotion,
  revealLines,
  whenFontsReady,
} from "../../lib/animations";
import { ROUTES } from "../../utils/constants";
import { useScrollTo } from "../../lib/lenisContext";
import liliwHall from "../../assets/events/liliw_municipal_hall.jpg";

/**
 * Two trust markers, set as a plain inline list rather than cards. Any more
 * than two and none of them get read.
 */
const ASSURANCES = ["Compliant with RA 11032", "Tracked at every stage"];

export default function Hero() {
  const sectionRef = useRef(null);
  const imageRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const leadRef = useRef(null);
  const actionsRef = useRef(null);
  const trackRef = useRef(null);
  const assuranceRef = useRef(null);
  const ruleRef = useRef(null);

  const [reference, setReference] = useState("");
  const navigate = useNavigate();
  const scrollTo = useScrollTo();

  useEffect(() => {
    let cleanupSplit = () => {};
    let cancelled = false;

    const ctx = gsap.context(() => {
      const reveal = [
        eyebrowRef.current,
        leadRef.current,
        actionsRef.current,
        trackRef.current,
        assuranceRef.current,
      ];

      if (prefersReducedMotion()) {
        gsap.set(reveal, { opacity: 1, y: 0 });
        gsap.set(imageRef.current, { opacity: 1, scale: 1 });
        gsap.set(ruleRef.current, { scaleX: 1 });
        return;
      }

      // The photograph settles out of a slow push-in. It resolves first because
      // the copy has to land on a stable backdrop.
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(
          imageRef.current,
          { opacity: 0, scale: 1.08 },
          { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out" },
          0,
        )
        .fromTo(
          eyebrowRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.6 },
          0.25,
        )
        .fromTo(
          [leadRef.current, actionsRef.current, trackRef.current],
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 },
          0.6,
        )
        .fromTo(
          assuranceRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.6 },
          0.95,
        )
        .fromTo(
          ruleRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.9 },
          0.4,
        );

      whenFontsReady().then(() => {
        if (cancelled) return;
        cleanupSplit = revealLines(headingRef.current, {
          delay: 0.35,
          stagger: 0.1,
          duration: 1,
        });
      });
    }, sectionRef);

    return () => {
      cancelled = true;
      cleanupSplit();
      ctx.revert();
    };
  }, []);

  /** Send a tracking reference to the status screen behind the login gate. */
  const handleTrack = (event) => {
    event.preventDefault();
    const value = reference.trim();
    if (!value) return;
    navigate(`${ROUTES.LOGIN}?ref=${encodeURIComponent(value)}`);
  };

  // Lenis owns the scroll position, so hand the anchor to it. Offset matches
  // HEADER_OFFSET in L-navbar.
  const handleProcessAnchor = (event) => {
    event.preventDefault();
    scrollTo("#process", { offset: -64 });
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[calc(100svh-6.5rem)] flex-col justify-center overflow-hidden bg-zinc-950"
    >
      {/* Background photograph. Decorative here: the caption and the heading
          already say where this is, so an alt text would only repeat them. */}
      <img
        ref={imageRef}
        src={liliwHall}
        alt=""
        aria-hidden="true"
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />

      {/*
        Two overlays rather than one. The horizontal pass guarantees contrast
        behind the copy column while leaving the building visible on the right;
        the vertical pass darkens the bottom edge so the section joins the next
        one without a hard seam.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/45"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/40"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p
            ref={eyebrowRef}
            className="will-reveal flex items-center gap-3 font-mono text-[11px] tracking-[0.18em] text-zinc-400 uppercase"
          >
            <span
              ref={ruleRef}
              aria-hidden="true"
              className="hairline h-px w-8 flex-none scale-x-0 bg-zinc-600"
            />
            Municipality of Liliw, Laguna
          </p>

          <h1
            ref={headingRef}
            id="hero-heading"
            className="will-reveal mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl"
          >
            Business permits, filed and tracked online.
          </h1>

          <p
            ref={leadRef}
            className="will-reveal mt-6 max-w-xl text-base leading-relaxed text-zinc-300"
          >
            The official Business Permits and Licensing portal of Liliw. Apply,
            renew, pay assessments, and download your permit without queueing at
            the municipal hall.
          </p>

          {/* Primary action is white-on-dark rather than the blue accent: on a
              photograph a saturated fill competes with the image, and white
              gives the higher contrast ratio. */}
          <div
            ref={actionsRef}
            className="will-reveal mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              to={ROUTES.REGISTER}
              className="group inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors duration-200 ease-out hover:bg-zinc-200 active:scale-[0.98] motion-reduce:transition-none"
            >
              Apply or renew
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <a
              href="#process"
              onClick={handleProcessAnchor}
              className="rounded-md border border-white/25 px-5 py-3 text-sm font-medium text-white transition-colors duration-200 ease-out hover:border-white/50 hover:bg-white/10"
            >
              How the process works
            </a>
          </div>

          {/* Status lookup. Placed in the hero because "where is my
              application?" is the most frequent return visit. */}
          <form
            ref={trackRef}
            onSubmit={handleTrack}
            className="will-reveal mt-8 max-w-md"
          >
            <label
              htmlFor="reference"
              className="block text-xs font-medium text-zinc-400"
            >
              Track an existing application
            </label>
            <div className="mt-2 flex items-center rounded-md border border-white/20 bg-white/5 pl-3 backdrop-blur-sm transition-colors duration-200 focus-within:border-white/45 focus-within:bg-white/10">
              <Search
                className="h-4 w-4 flex-none text-zinc-400"
                aria-hidden="true"
              />
              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Application no. or BIN"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="submit"
                className="m-1 flex-none rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors duration-200 hover:bg-zinc-200"
              >
                Track
              </button>
            </div>
          </form>

          {/* Set inline on one hairline-separated row instead of as two cards:
              at this size they are labels, and cards would add weight the
              section does not need. */}
          <ul
            ref={assuranceRef}
            className="will-reveal mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-5 font-mono text-[10px] tracking-[0.14em] text-zinc-400 uppercase"
          >
            {ASSURANCES.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li className="text-zinc-500">
              Business Permits and Licensing Office
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
