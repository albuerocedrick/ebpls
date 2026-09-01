/**
 * LocalBusiness.jsx
 * Who the portal serves, with the figures that justify the claim.
 *
 * Liliw's economy is dominated by footwear manufacture and retail, so the page
 * names those trades explicitly. A generic "for businesses" statement would
 * leave a slipper maker unsure whether the portal covers a home workshop.
 */
import { useEffect, useRef } from "react";

import { gsap } from "../../lib/gsap";
import {
  countUp,
  drawLine,
  drift,
  resetCountUp,
  revealLines,
  revealStagger,
  whenFontsReady,
} from "../../lib/animations";

const SECTORS = [
  {
    title: "Footwear manufacturers and retailers",
    desc: "Slipper and shoe workshops, artisan retail along Gat Tayaw Street, and seasonal storefronts during the Tsinelas Festival.",
  },
  {
    title: "Micro, small, and medium enterprises",
    desc: "Sari-sari stores, eateries, service shops, and market vendors, assessed from the same fee schedule used at the hall.",
  },
  {
    title: "Home-based and online sellers",
    desc: "Businesses operating from a residence still need a permit. The form has a shorter path for them.",
  },
  {
    title: "Barangay-endorsed enterprises",
    desc: "Clearance endorsements and tax assessments are routed between offices online, so documents are submitted once.",
  },
];

const FIGURES = [
  { value: "1,400+", label: "Registered businesses in Liliw" },
  { value: "33", label: "Barangays covered" },
  { value: "24 hrs", label: "Target verification turnaround" },
];

export default function LocalBusiness() {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const leadRef = useRef(null);
  const asideRef = useRef(null);
  const figuresRef = useRef(null);
  const figureRuleRef = useRef(null);
  const rowsRef = useRef(null);

  useEffect(() => {
    let cleanupSplit = () => {};
    let cancelled = false;
    const figureValues =
      figuresRef.current?.querySelectorAll("[data-figure-value]") ?? [];

    const ctx = gsap.context(() => {
      const trigger = {
        trigger: sectionRef.current,
        start: "top 76%",
        toggleActions: "play none none reverse",
      };

      revealStagger([eyebrowRef.current, leadRef.current], {
        y: 16,
        stagger: 0.08,
        scrollTrigger: trigger,
      });

      drawLine(figureRuleRef.current, { trigger: figuresRef.current });

      revealStagger(figuresRef.current?.children, {
        y: 18,
        stagger: 0.08,
        duration: 0.7,
        scrollTrigger: {
          trigger: figuresRef.current,
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });

      figureValues.forEach((node) =>
        countUp(node, {
          scrollTrigger: { trigger: figuresRef.current, start: "top 85%" },
        }),
      );

      revealStagger(rowsRef.current?.children, {
        y: 22,
        stagger: 0.1,
        duration: 0.7,
        scrollTrigger: {
          trigger: rowsRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      // Each row's rule draws open as the group arrives.
      drawLine(rowsRef.current?.querySelectorAll("[data-row-rule]"), {
        trigger: rowsRef.current,
        stagger: 0.1,
      });

      /*
       * The heading column lifts slightly slower than the rows beside it. This
       * is the only parallax on the page: a sticky column would fight Lenis on
       * short viewports, and a scrubbed drift costs nothing.
       */
      drift(asideRef.current, { trigger: sectionRef.current, distance: 40 });

      whenFontsReady().then(() => {
        if (cancelled) return;
        cleanupSplit = revealLines(headingRef.current, {
          stagger: 0.09,
          duration: 0.95,
          scrollTrigger: trigger,
        });
      });
    }, sectionRef);

    return () => {
      cancelled = true;
      cleanupSplit();
      ctx.revert();
      // ctx.revert() cannot restore textContent, so reset the labels by hand.
      figureValues.forEach((node) => resetCountUp(node));
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="local-business"
      aria-labelledby="local-business-heading"
      className="border-b border-zinc-200 bg-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div ref={asideRef} className="lg:col-span-5">
            <span
              ref={eyebrowRef}
              className="will-reveal block font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase"
            >
              Who this is for
            </span>
            <h2
              ref={headingRef}
              id="local-business-heading"
              className="will-reveal mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl"
            >
              Built around Liliw&apos;s local trade
            </h2>
            <p
              ref={leadRef}
              className="will-reveal mt-5 max-w-md text-sm leading-relaxed text-zinc-600"
            >
              The portal covers the business types that make up most of the
              town&apos;s economy, from footwear workshops to public market
              stalls.
            </p>

            <div
              ref={figureRuleRef}
              aria-hidden="true"
              className="hairline mt-10 h-px w-full scale-x-0 bg-zinc-200"
            />

            <dl ref={figuresRef} className="mt-8 flex flex-wrap gap-y-6">
              {FIGURES.map((figure) => (
                <div
                  key={figure.label}
                  className="will-reveal min-w-[8rem] flex-1 border-l border-zinc-200 pl-5 first:border-l-0 first:pl-0"
                >
                  <dd
                    data-figure-value
                    className="text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums"
                  >
                    {figure.value}
                  </dd>
                  <dt className="mt-2 text-xs leading-relaxed text-zinc-600">
                    {figure.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <div ref={rowsRef} className="lg:col-span-7">
            {SECTORS.map((item, itemIndex) => (
              <div
                key={item.title}
                className="will-reveal group relative flex gap-8 py-8 first:pt-0 last:pb-0"
              >
                <span
                  data-row-rule
                  aria-hidden="true"
                  className="hairline absolute inset-x-0 top-0 h-px scale-x-0 bg-zinc-200 group-first:hidden"
                />

                <span className="w-8 shrink-0 pt-1 font-mono text-xs text-zinc-400 transition-colors duration-300 group-hover:text-zinc-900 motion-reduce:transition-none">
                  {String(itemIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-pretty text-zinc-900">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-zinc-600">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
