/**
 * Requirements.jsx
 * What to prepare before starting, split by transaction type.
 *
 * Incomplete submissions are the main reason applications get returned, so the
 * checklist is stated on the public page rather than discovered inside the
 * wizard. The two columns are separate lists instead of a tabbed control: at
 * this length, showing both costs less attention than a control to switch.
 *
 * The rows are real checkboxes rather than static bullets. The instruction here
 * is "prepare these" â€” a task the visitor performs away from the screen, often
 * over several days â€” so the list is built to be worked against, with a count
 * and a progress rail per column. Ticks persist to localStorage for the same
 * reason: a list that forgot itself on reload would be worse than no list.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Info, RotateCcw } from "lucide-react";

import { gsap } from "../../lib/gsap";
import {
  drawLine,
  revealLines,
  revealStagger,
  whenFontsReady,
} from "../../lib/animations";
import { ROUTES } from "../../utils/constants";

const STORAGE_KEY = "ebpls:requirements-ready";

const CHECKLISTS = [
  {
    id: "new",
    label: "New registration",
    caption: "First-time registration",
    items: [
      "DTI, SEC, or CDA registration certificate",
      "Barangay business clearance",
      "Lease contract or proof of property ownership",
      "Two valid government IDs of the owner",
      "Sketch or photo of the business location",
    ],
  },
  {
    id: "renewal",
    label: "Annual renewal",
    caption: "Annual renewal, Jan to Mar",
    items: [
      "Previous year's mayor's permit",
      "Sworn statement of gross receipts",
      "Barangay business clearance for the current year",
      "Fire safety inspection certificate",
      "Proof of payment for the prior assessment",
    ],
  },
];

/** Clearances that apply only to certain lines of business. */
const CONDITIONAL = ["Sanitary permit", "Environmental compliance certificate"];

/** Stable storage key for one row. */
const rowKey = (listId, index) => `${listId}:${index}`;

/**
 * Read previously ticked rows.
 * Wrapped because localStorage throws in private mode and on blocked origins,
 * and a checklist is not worth breaking the page over.
 */
function loadReady() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function Requirements() {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const leadRef = useRef(null);
  const ruleRef = useRef(null);
  const columnsRef = useRef(null);
  const noteRef = useRef(null);

  // Sparse map keyed as `{ "new:0": true }`, so only ticked rows are stored.
  const [ready, setReady] = useState(loadReady);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ready));
    } catch {
      /* storage unavailable; the list still works for this visit */
    }
  }, [ready]);

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

      revealStagger(columnsRef.current?.children, {
        y: 20,
        stagger: 0.1,
        duration: 0.7,
        scrollTrigger: {
          trigger: columnsRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      revealStagger(noteRef.current, {
        y: 16,
        duration: 0.7,
        scrollTrigger: {
          trigger: noteRef.current,
          start: "top 92%",
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

  const toggle = (listId, index) => {
    const key = rowKey(listId, index);
    setReady((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const tickedCount = Object.keys(ready).length;

  return (
    <section
      ref={sectionRef}
      id="requirements"
      aria-labelledby="requirements-heading"
      className="border-b border-zinc-200 bg-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span
              ref={eyebrowRef}
              className="will-reveal block font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase"
            >
              Before you start
            </span>
            <h2
              ref={headingRef}
              id="requirements-heading"
              className="will-reveal mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl"
            >
              Prepare these and you will finish in one sitting.
            </h2>
          </div>
          <div ref={leadRef} className="will-reveal max-w-sm">
            <p className="text-sm leading-relaxed text-zinc-600">
              Scanned copies or clear photos are accepted. Files can be uploaded
              one at a time, and your progress is saved as a draft.
            </p>
            {/* Only offered once there is something to clear, so the control
                never sits on the page as dead weight on a first visit. */}
            {tickedCount > 0 && (
              <button
                type="button"
                onClick={() => setReady({})}
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase transition-colors duration-200 hover:text-zinc-900"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Reset checklist
              </button>
            )}
          </div>
        </div>

        <div
          ref={ruleRef}
          aria-hidden="true"
          className="hairline mt-10 h-px w-full scale-x-0 bg-zinc-200"
        />

        <div ref={columnsRef} className="mt-10 grid gap-6 lg:grid-cols-2">
          {CHECKLISTS.map((list) => {
            const done = list.items.filter(
              (_, index) => ready[rowKey(list.id, index)],
            ).length;
            const complete = done === list.items.length;

            return (
              <div
                key={list.id}
                className="will-reveal flex flex-col rounded-lg border border-zinc-200 bg-surface p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      {list.label}
                    </h3>
                    <p className="mt-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-400 uppercase">
                      {list.caption}
                    </p>
                  </div>
                  {/* Tabular figures keep the count from changing width as it
                      climbs, which would jitter the header on every tick. */}
                  <span
                    className={`flex-none font-mono text-[10px] tracking-[0.12em] tabular-nums uppercase transition-colors duration-300 ${
                      complete ? "text-zinc-900" : "text-zinc-400"
                    }`}
                  >
                    {done} of {list.items.length} ready
                  </span>
                </div>

                {/* Progress rail, hidden from assistive tech because the count
                    above already carries the same value. */}
                <div
                  aria-hidden="true"
                  className="mt-4 h-px w-full overflow-hidden bg-zinc-200"
                >
                  <div
                    className="h-full origin-left bg-zinc-900 transition-transform duration-500 ease-out motion-reduce:transition-none"
                    style={{ transform: `scaleX(${done / list.items.length})` }}
                  />
                </div>

                <ul className="mt-5 flex flex-1 flex-col">
                  {list.items.map((item, index) => {
                    const checked = Boolean(ready[rowKey(list.id, index)]);

                    return (
                      <li
                        key={item}
                        className="border-b border-zinc-200/70 last:border-b-0"
                      >
                        {/*
                          A real checkbox inside a label rather than a div with a
                          click handler: the whole row becomes one hit target, it
                          stays reachable by keyboard, and screen readers
                          announce the checked state with no ARIA of our own.
                          The input is visually hidden but still focusable, and
                          the custom box mirrors it through peer-*, so the focus
                          ring remains visible.
                        */}
                        <label className="group flex cursor-pointer items-start gap-3 py-3 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(list.id, index)}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className="mt-px flex h-4 w-4 flex-none items-center justify-center rounded-[3px] border border-zinc-300 bg-white transition-colors duration-200 ease-out group-hover:border-zinc-500 peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-current motion-reduce:transition-none"
                          >
                            <Check
                              className={`h-3 w-3 text-white transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                                checked ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </span>
                          <span
                            className={`leading-relaxed transition-colors duration-200 ease-out motion-reduce:transition-none ${
                              checked ? "text-zinc-400" : "text-zinc-700"
                            }`}
                          >
                            {item}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Escape hatch: the checklist cannot cover every business type, so the
            page says so rather than letting the applicant guess. The two common
            extras are named as chips because "such as ..." buried mid-sentence
            was easy to skim past, and these two account for most returns. */}
        <div
          ref={noteRef}
          className="will-reveal mt-8 flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
        >
          <div className="flex gap-3">
            <Info
              className="mt-0.5 h-4 w-4 flex-none text-zinc-500"
              aria-hidden="true"
            />
            <div>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-600">
                Some lines of business need extra clearances. The form tells you
                which ones apply once you select yours.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {CONDITIONAL.map((clearance) => (
                  <li
                    key={clearance}
                    className="rounded-full border border-zinc-200 bg-surface px-2.5 py-1 font-mono text-[10px] tracking-[0.1em] text-zinc-500 uppercase"
                  >
                    {clearance}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Link
            to={ROUTES.REGISTER}
            className="group inline-flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-zinc-900 sm:self-center"
          >
            Check my requirements
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
