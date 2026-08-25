/**
 * ServiceTasks.jsx
 * The primary task grid: the four things a visitor actually comes here to do.
 *
 * Sits directly under the hero because a permit portal is transactional. The
 * page offers the visitor's likely intent before explaining anything about
 * itself.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  FilePlus2,
  Receipt,
  RefreshCw,
} from "lucide-react";

import { gsap } from "../../lib/gsap";
import {
  attachSpotlight,
  drawLine,
  revealLines,
  revealStagger,
  whenFontsReady,
} from "../../lib/animations";
import { ROUTES } from "../../utils/constants";

const TASKS = [
  {
    icon: FilePlus2,
    title: "Apply for a new permit",
    who: "First-time registration",
    desc: "File the unified application form for a business starting operations in Liliw.",
    action: "Start an application",
    route: ROUTES.REGISTER,
    primary: true,
  },
  {
    icon: RefreshCw,
    title: "Renew a business permit",
    who: "Annual renewal, Jan to Mar",
    desc: "Carry over last year's details, update your gross receipts, and resubmit.",
    action: "Renew now",
    route: ROUTES.LOGIN,
  },
  {
    icon: Receipt,
    title: "Pay an assessment",
    who: "You have an order of payment",
    desc: "Settle mayor's permit, sanitary, and business tax fees, then download your e-Resibo.",
    action: "View my assessment",
    route: ROUTES.LOGIN,
  },
  {
    icon: Archive,
    title: "Retire a business",
    who: "Closing or transferring",
    desc: "File for retirement so no further business tax is assessed against your record.",
    action: "File a retirement",
    route: ROUTES.LOGIN,
  },
];

export default function ServiceTasks() {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const leadRef = useRef(null);
  const ruleRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    let cleanupSplit = () => {};
    let cleanupSpotlight = () => {};
    let cancelled = false;

    const ctx = gsap.context(() => {
      const trigger = {
        trigger: sectionRef.current,
        start: "top 78%",
        toggleActions: "play none none reverse",
      };

      revealStagger([eyebrowRef.current, leadRef.current], {
        y: 16,
        stagger: 0.08,
        scrollTrigger: trigger,
      });

      drawLine(ruleRef.current, { trigger: sectionRef.current });

      revealStagger(gridRef.current?.children, {
        y: 22,
        stagger: 0.07,
        duration: 0.7,
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });

      cleanupSpotlight = attachSpotlight(gridRef.current, "[data-card]");

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
      cleanupSpotlight();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      aria-labelledby="services-heading"
      className="border-b border-zinc-200 bg-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span
              ref={eyebrowRef}
              className="will-reveal block font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase"
            >
              Online services
            </span>
            <h2
              ref={headingRef}
              id="services-heading"
              className="will-reveal mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl"
            >
              What do you need to do today?
            </h2>
          </div>
          <p
            ref={leadRef}
            className="will-reveal max-w-sm text-sm leading-relaxed text-zinc-600"
          >
            Every transaction below is handled end to end online. You only need
            to visit the hall to claim a printed permit, and only if you ask for
            one.
          </p>
        </div>

        {/* Standalone element rather than a border so GSAP can draw it open. */}
        <div
          ref={ruleRef}
          aria-hidden="true"
          className="hairline mt-10 h-px w-full scale-x-0 bg-zinc-200"
        />

        <ul
          ref={gridRef}
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TASKS.map((task) => {
            const Icon = task.icon;

            return (
              <li
                key={task.title}
                data-card
                className="spotlight will-reveal group relative isolate flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <span
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-300 ease-out motion-reduce:transition-none ${
                    task.primary
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>

                <h3 className="relative z-10 mt-5 text-base font-semibold text-pretty text-zinc-900">
                  {task.title}
                </h3>
                <p className="relative z-10 mt-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-400 uppercase">
                  {task.who}
                </p>
                <p className="relative z-10 mt-3 flex-1 text-sm leading-relaxed text-zinc-600">
                  {task.desc}
                </p>

                <Link
                  to={task.route}
                  className="relative z-10 mt-6 inline-flex items-center gap-1.5 border-t border-zinc-100 pt-4 text-sm font-medium text-zinc-900"
                >
                  {task.action}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
