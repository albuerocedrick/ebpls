import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import bfpCall1 from "../../assets/events/bfp_courtesy_call_1.jpg";
import bfpCall2 from "../../assets/events/bfp_courtesy_call_2.jpg";
import bfpInspection1 from "../../assets/events/bfp_dengue_inspection_1.jpg";
import bfpInspection2 from "../../assets/events/bfp_tire_inspection_2.jpg";

const SLIDE_DURATION = 5000;

const SLIDES = [
  {
    id: 1,
    image: bfpCall1,
    title: "Courtesy call with the Liliw Fire Station",
    summary:
      "Coordination with the Acting Municipal Fire Marshal on automated fire safety clearance checks inside the e-BPLS workflow.",
    date: "June 22, 2026",
    location: "Liliw Fire Station",
  },
  {
    id: 2,
    image: bfpCall2,
    title: "Paperless fire safety clearance review",
    summary:
      "Document verification between the BPLO and Bureau of Fire Protection officers now happens without printed submissions.",
    date: "June 22, 2026",
    location: "BFP Liliw Headquarters",
  },
  {
    id: 3,
    image: bfpInspection1,
    title: "Sanitation and inspection drive",
    summary:
      "Fire station personnel carried out environmental sanitation checks around merchant stalls in the commercial zone.",
    date: "July 2026",
    location: "Liliw commercial zone",
  },
  {
    id: 4,
    image: bfpInspection2,
    title: "Dengue prevention check for business premises",
    summary:
      "Field inspection of stored containers and tires around local businesses to prevent mosquito breeding sites.",
    date: "July 2026",
    location: "Liliw public market",
  },
];

export default function EventsSlider() {
  const [index, setIndex] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(true);

  const goTo = useCallback((next) => {
    setIndex((prev) => {
      const total = SLIDES.length;
      const target = typeof next === "function" ? next(prev) : next;
      return (target + total) % total;
    });
  }, []);

  useEffect(() => {
    if (!autoPlaying) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setInterval(
      () => goTo((prev) => prev + 1),
      SLIDE_DURATION,
    );
    return () => clearInterval(timer);
  }, [autoPlaying, goTo]);

  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
  };

  return (
    <section
      id="events"
      className="flex min-h-svh items-center border-b border-zinc-200 bg-zinc-50"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
            Newsroom
          </span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-5xl">
            Municipal updates
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600">
            Inspections, clearance drives, and inter-agency coordination
            affecting local business owners.
          </p>
        </div>

        <div
          role="group"
          aria-roledescription="carousel"
          aria-label="Municipal updates"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={() => setAutoPlaying(false)}
          onMouseLeave={() => setAutoPlaying(true)}
          onFocus={() => setAutoPlaying(false)}
          onBlur={() => setAutoPlaying(true)}
          className="group mt-12 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow duration-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Image stack: slides cross-fade and settle from a slight zoom */}
            <div className="relative h-64 overflow-hidden bg-zinc-100 sm:h-80 lg:col-span-7 lg:h-[27rem]">
              {SLIDES.map((slide, slideIndex) => {
                const active = slideIndex === index;
                return (
                  <div
                    key={slide.id}
                    aria-hidden={!active}
                    className={`absolute inset-0 transition-all duration-700 ease-in-out motion-reduce:transition-none ${active
                        ? "z-10 scale-100 opacity-100"
                        : "z-0 scale-105 opacity-0"
                      }`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      draggable="false"
                      className="h-full w-full object-cover"
                    />
                  </div>
                );
              })}
            </div>

            {/* Detail stack: copy fades up just behind the image change */}
            <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-5">
              <div className="grid">
                {SLIDES.map((slide, slideIndex) => {
                  const active = slideIndex === index;
                  return (
                    <div
                      key={slide.id}
                      aria-hidden={!active}
                      className={`col-start-1 row-start-1 transition-all duration-700 ease-in-out motion-reduce:transition-none ${active
                          ? "translate-y-0 opacity-100 delay-150"
                          : "pointer-events-none translate-y-3 opacity-0"
                        }`}
                    >
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                        <span>{slide.date}</span>
                        <span aria-hidden="true" className="text-zinc-300">
                          |
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {slide.location}
                        </span>
                      </p>
                      <h3 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-pretty text-zinc-900">
                        {slide.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                        {slide.summary}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-200 pt-6">
                <div className="flex items-center gap-2">
                  {SLIDES.map((slide, dotIndex) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => goTo(dotIndex)}
                      aria-label={`Show update ${dotIndex + 1}`}
                      aria-current={dotIndex === index}
                      className={`h-2 rounded-full transition-all duration-300 ease-in-out motion-reduce:transition-none ${dotIndex === index
                          ? "w-8 bg-zinc-900"
                          : "w-2 bg-zinc-200 hover:bg-zinc-300"
                        }`}
                    />
                  ))}
                </div>

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => goTo(index - 1)}
                    aria-label="Previous update"
                    className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-zinc-200 bg-white text-zinc-600 transition-colors duration-200 ease-out hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none motion-reduce:transition-none"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(index + 1)}
                    aria-label="Next update"
                    className="-ml-px flex h-9 w-9 items-center justify-center rounded-r-lg border border-zinc-200 bg-white text-zinc-600 transition-colors duration-200 ease-out hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none motion-reduce:transition-none"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
