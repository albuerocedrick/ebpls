/**
 * Updates.jsx
 * Municipal announcements and BPLO activity.
 *
 * Replaces the previous auto-playing carousel. On a government site, rotating
 * content actively works against the reader: it hides items behind a timer,
 * moves targets under the cursor, and is awkward for screen readers. A static
 * editorial grid shows every item at once and needs no controls.
 */
import { useEffect, useRef } from "react";

import { gsap } from "../../lib/gsap";
import {
  drawLine,
  imageReveal,
  revealLines,
  revealStagger,
  whenFontsReady,
} from "../../lib/animations";

import bfpCall1 from "../../assets/events/bfp_courtesy_call_1.jpg";
import bfpCall2 from "../../assets/events/bfp_courtesy_call_2.jpg";
import bfpInspection1 from "../../assets/events/bfp_dengue_inspection_1.jpg";
import bfpTire from "../../assets/events/bfp_tire_inspection_2.jpg";

const FEATURED = {
  image: bfpCall1,
  alt: "BPLO officers in a courtesy call at the Liliw Fire Station",
  category: "Interagency",
  date: "June 22, 2026",
  title: "Fire safety clearance checks are now part of the e-BPLS workflow",
  summary:
    "Following a courtesy call with the Acting Municipal Fire Marshal, fire safety inspection certificates are verified directly between the BPLO and the Bureau of Fire Protection. Applicants no longer submit a printed copy.",
};

const UPDATES = [
  {
    image: bfpCall2,
    alt: "Document review between BPLO and fire protection officers",
    category: "Process",
    date: "June 22, 2026",
    title: "Paperless clearance review between offices",
    summary:
      "Document verification now happens without printed submissions moving between departments.",
  },
  {
    image: bfpInspection1,
    alt: "Sanitation inspection around merchant stalls",
    category: "Inspection",
    date: "July 2026",
    title: "Sanitation drive in the commercial zone",
    summary:
      "Environmental sanitation checks were carried out around merchant stalls and storefronts.",
  },
  {
    image: bfpTire,
    alt: "Inspection of stored tires behind a business establishment",
    category: "Advisory",
    date: "July 2026",
    title: "Dengue prevention check for business premises",
    summary:
      "Stored containers and tires around local businesses were inspected for mosquito breeding sites.",
  },
];

export default function Updates() {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const leadRef = useRef(null);
  const ruleRef = useRef(null);
  const featureRef = useRef(null);
  const featureImageRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let cleanupSplit = () => {};
    let cancelled = false;

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

      drawLine(ruleRef.current, { trigger: sectionRef.current });

      revealStagger(featureRef.current, {
        y: 24,
        duration: 0.8,
        scrollTrigger: {
          trigger: featureRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      // Clip-path wipe rather than a fade: an editorial image should never look
      // washed out halfway through its reveal.
      imageReveal(featureImageRef.current, {
        trigger: featureRef.current,
        duration: 1.2,
      });

      revealStagger(listRef.current?.children, {
        y: 20,
        stagger: 0.09,
        duration: 0.7,
        scrollTrigger: {
          trigger: listRef.current,
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });

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
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="updates"
      aria-labelledby="updates-heading"
      className="border-b border-zinc-200 bg-surface"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span
              ref={eyebrowRef}
              className="will-reveal block font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase"
            >
              Announcements
            </span>
            <h2
              ref={headingRef}
              id="updates-heading"
              className="will-reveal mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl"
            >
              From the licensing office
            </h2>
          </div>
          <p
            ref={leadRef}
            className="will-reveal max-w-sm text-sm leading-relaxed text-zinc-600"
          >
            Advisories affecting business permits, inspection schedules, and
            coordination with other municipal offices.
          </p>
        </div>

        <div
          ref={ruleRef}
          aria-hidden="true"
          className="hairline mt-10 h-px w-full scale-x-0 bg-zinc-200"
        />

        {/* Lead story gets the image and the largest type; the remaining three
            are equal siblings below it. A single focal point per section. */}
        <article
          ref={featureRef}
          className="will-reveal mt-10 grid gap-8 overflow-hidden rounded-lg border border-zinc-200 bg-white lg:grid-cols-2 lg:gap-0"
        >
          <div className="overflow-hidden bg-zinc-100 lg:order-2">
            <img
              ref={featureImageRef}
              src={FEATURED.image}
              alt={FEATURED.alt}
              loading="lazy"
              // Capped height: left unbounded, the portrait source drives the
              // grid row far taller than the copy beside it.
              className="max-h-[24rem] w-full object-cover lg:max-h-[26rem]"
            />
          </div>

          <div className="flex flex-col justify-center p-8 lg:order-1 lg:p-10">
            <p className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] tracking-[0.14em] text-zinc-500 uppercase">
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
                {FEATURED.category}
              </span>
              <span>{FEATURED.date}</span>
            </p>
            <h3 className="mt-5 text-2xl leading-snug font-semibold tracking-tight text-pretty text-zinc-900">
              {FEATURED.title}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              {FEATURED.summary}
            </p>
          </div>
        </article>

        <ul ref={listRef} className="mt-6 grid gap-6 md:grid-cols-3">
          {UPDATES.map((item) => (
            <li
              key={item.title}
              className="will-reveal group flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="aspect-16/10 overflow-hidden bg-zinc-100">
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>

              <div className="flex flex-1 flex-col p-6">
                <p className="flex flex-wrap items-center gap-x-2 font-mono text-[10px] tracking-[0.14em] text-zinc-500 uppercase">
                  <span>{item.category}</span>
                  <span aria-hidden="true" className="text-zinc-300">
                    ·
                  </span>
                  <span>{item.date}</span>
                </p>
                <h3 className="mt-3 text-base leading-snug font-semibold text-pretty text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {item.summary}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
