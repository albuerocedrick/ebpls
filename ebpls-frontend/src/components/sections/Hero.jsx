import { useEffect, useRef, useState } from "react";
import { gsap } from "../../lib/gsap";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import liliwHall from "../../assets/events/liliw_municipal_hall.jpg";
import { ArrowRight, Search } from "lucide-react";

const STATS = [
  { value: "1,400+", label: "Registered businesses" },
  { value: "24 hrs", label: "Average processing" },
  { value: "32", label: "Barangays connected" },
];

export default function Hero() {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const imageRef = useRef(null);
  const [reference, setReference] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const items = contentRef.current
        ? Array.from(contentRef.current.children)
        : [];
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (reduceMotion) {
        gsap.set(items, { y: 0, opacity: 1 });
        gsap.set(imageRef.current, { scale: 1, opacity: 1 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        imageRef.current,
        { scale: 1.12, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.8, ease: "power2.out" },
      ).fromTo(
        items,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, stagger: 0.09 },
        0.25,
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = reference.trim();
    if (!value) return;
    navigate(`${ROUTES.REGISTER}?bin=${encodeURIComponent(value)}`);
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative isolate flex min-h-[calc(100svh-6.5rem)] flex-col overflow-hidden bg-zinc-950"
    >
      <img
        ref={imageRef}
        src={liliwHall}
        alt="Municipal hall of Liliw, Laguna"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/40"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/30"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div ref={contentRef} className="max-w-3xl">
          <p className="flex items-center gap-3 text-sm font-medium text-zinc-400">
            <span aria-hidden="true" className="h-px w-8 flex-none bg-zinc-600" />
            Municipality of Liliw, Laguna
          </p>

          <h1 className="mt-6 text-[2.75rem] leading-[1.02] font-semibold tracking-tight text-balance text-white sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
            Business permits,
            <span className="block text-zinc-500">without the queue.</span>
          </h1>

          <p className="mt-8 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            Register a new business, renew a permit, or check where your
            application stands — all without a trip to the municipal hall.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to={ROUTES.REGISTER}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-zinc-900 transition duration-200 ease-out hover:bg-zinc-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Start an application
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center rounded-full border border-white/25 px-6 py-3.5 text-sm font-medium text-white transition duration-200 ease-out hover:border-white/60 hover:bg-white/10 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Renew a permit
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 max-w-md">
            <label htmlFor="reference" className="sr-only">
              Track an existing application
            </label>
            <div className="group flex items-center rounded-full border border-white/20 bg-white/5 pr-1.5 pl-4 backdrop-blur-sm transition duration-200 ease-out hover:border-white/35 focus-within:border-white/70 focus-within:bg-white/10">
              <Search
                aria-hidden="true"
                className="h-4 w-4 flex-none text-zinc-400 transition-colors duration-200 group-focus-within:text-white"
              />
              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Track an application no. or BIN"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                className="flex-none rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition duration-200 ease-out hover:bg-white/20 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Track
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <dl className="flex flex-wrap items-end gap-y-6 border-t border-white/15 pt-8">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="min-w-[9rem] flex-1 border-l border-white/15 px-6 first:border-l-0 first:pl-0"
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block text-3xl font-semibold tracking-tight text-white lg:text-4xl">
                  {stat.value}
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-zinc-400">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
          <p className="min-w-[14rem] flex-1 border-l border-white/15 px-6 text-xs leading-relaxed text-zinc-400">
            Business Permits and Licensing Office
            <span className="mt-1.5 block text-zinc-500">
              M.H. del Pilar St. · Mon–Fri, 8:00 AM – 5:00 PM
            </span>
          </p>
        </dl>
      </div>
    </section>
  );
}
