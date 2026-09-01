/**
 * ProcessTimeline.jsx
 * The five stages an application passes through, in order.
 *
 * This mirrors the backend state machine in `utils/constants.js` (Pending →
 * Under Review → Assessed → Paid → Completed) so what the page promises and
 * what the system does cannot drift apart. Applicants ask "what happens next?"
 * more than any other question, so the answer is stated as a sequence with the
 * responsible office named at each step.
 */
import { useEffect, useRef } from "react";

import { gsap } from "../../lib/gsap";
import {
  drawLine,
  revealLines,
  revealStagger,
  whenFontsReady,
} from "../../lib/animations";

const STAGES = [
  {
    stage: "01",
    title: "Submit your application",
    office: "Applicant",
    desc: "Complete the unified form and upload your requirements. Drafts are saved as you go, so you can finish later.",
  },
  {
    stage: "02",
    title: "Document verification",
    office: "BPLO",
    desc: "A licensing officer checks your submission. If something is missing, the application is returned with a note naming exactly what to fix.",
  },
  {
    stage: "03",
    title: "Barangay and fire clearance",
    office: "Barangay · BFP",
    desc: "Clearances are endorsed between offices online. You do not resubmit documents you have already provided.",
  },
  {
    stage: "04",
    title: "Assessment and payment",
    office: "Treasury",
    desc: "Fees are itemised against the official schedule. Pay at the hall or online, then download your e-Resibo.",
  },
  {
    stage: "05",
    title: "Permit issued",
    office: "BPLO",
    desc: "Your permit is released with a QR code inspectors can verify on site. A printed copy can be claimed at the hall.",
  },
];

export default function ProcessTimeline() {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const leadRef = useRef(null);
  const listRef = useRef(null);
  const railRef = useRef(null);

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

      revealStagger(listRef.current?.children, {
        y: 20,
        stagger: 0.1,
        duration: 0.7,
        scrollTrigger: {
          trigger: listRef.current,
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });

      /*
       * The connecting rail draws itself downward as the list scrolls past,
       * which is what makes the five stages read as one continuous process
       * rather than five unrelated cards. Scrubbed so it tracks the scroll
       * position exactly.
       */
      drawLine(railRef.current, {
        trigger: listRef.current,
        axis: "y",
        scrub: true,
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
      id="process"
      aria-labelledby="process-heading"
      className="border-b border-zinc-200 bg-surface"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-20 lg:px-8 lg:py-24">
        <div className="lg:col-span-4">
          <span
            ref={eyebrowRef}
            className="will-reveal block font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase"
          >
            The process
          </span>
          <h2
            ref={headingRef}
            id="process-heading"
            className="will-reveal mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl"
          >
            Five stages, and you can see all of them.
          </h2>
          <p
            ref={leadRef}
            className="will-reveal mt-5 text-sm leading-relaxed text-zinc-600"
          >
            Nothing happens off the record. Each stage names the office
            responsible, so you always know who is holding your application and
            what it is waiting on.
          </p>
        </div>

        <ol ref={listRef} className="relative lg:col-span-8">
          {/* Rail sits behind the markers and is drawn downward on scroll. */}
          <span
            ref={railRef}
            aria-hidden="true"
            className="absolute top-2 bottom-2 left-[15px] w-px origin-top scale-y-0 bg-zinc-300"
          />

          {STAGES.map((item) => (
            <li
              key={item.stage}
              className="will-reveal group relative flex gap-6 pb-10 last:pb-0"
            >
              {/* Ring marker. Filled on hover so the row responds without
                  moving, which would fight the drawn rail. */}
              <span
                aria-hidden="true"
                className="relative z-10 mt-1 flex h-8 w-8 flex-none items-center justify-center rounded-full border border-zinc-300 bg-white font-mono text-[10px] text-zinc-500 transition-colors duration-300 ease-out group-hover:border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white motion-reduce:transition-none"
              >
                {item.stage}
              </span>

              <div className="pt-1.5">
                <p className="font-mono text-[10px] tracking-[0.14em] text-zinc-500 uppercase">
                  {item.office}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-pretty text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
                  {item.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
