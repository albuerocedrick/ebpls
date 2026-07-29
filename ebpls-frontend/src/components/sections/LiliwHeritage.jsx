import React, { useEffect, useRef } from "react";
import { gsap } from "../../lib/gsap";

const HIGHLIGHTS = [
  {
    title: "Footwear manufacturers and retailers",
    desc: "Licensing for slipper and shoe workshops, artisan retail shops, and their seasonal storefronts along Gat Tayaw Street.",
  },
  {
    title: "Micro, small, and medium enterprises",
    desc: "Simplified permits for MSMEs, trade fair stalls, and market vendors, with fees computed from the same schedule used at the hall.",
  },
  {
    title: "Barangay and treasury coordination",
    desc: "Clearance endorsements and tax assessments are routed between offices online, so applicants submit documents once.",
  },
];

export default function LiliwHeritage() {
  const sectionRef = useRef(null);
  const rowsRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        rowsRef.current?.children || [],
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="liliw-heritage"
      className="flex min-h-svh items-center border-b border-zinc-200 bg-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
              Local business
            </span>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-5xl">
              Built around Liliw&apos;s local trade
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-zinc-600">
              The portal covers the business types that make up most of the
              town&apos;s economy, from footwear workshops to public market
              stalls.
            </p>
          </div>

          <div ref={rowsRef} className="lg:col-span-7">
            {HIGHLIGHTS.map((item, itemIndex) => (
              <div
                key={item.title}
                className="group flex gap-8 border-t border-zinc-200 py-8 transition-colors duration-300 ease-out last:border-b hover:border-zinc-400 motion-reduce:transition-none"
              >
                <span className="w-8 shrink-0 pt-1 text-sm font-medium text-zinc-400 transition-colors duration-300 group-hover:text-zinc-900 motion-reduce:transition-none">
                  {String(itemIndex + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-pretty text-zinc-900 transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
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
