import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const ITEMS = [
  "e-BPLS portal is open for Q3 business tax payments and renewals.",
  "Three-step business permit filing is live with online tracking.",
  "Barangay and fire safety clearances are now verified automatically.",
];

export default function AnnouncementsTicker() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % ITEMS.length);
    }, 6000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      className="border-b border-zinc-200 bg-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto flex h-10 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <span className="shrink-0 text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
          Announcement
        </span>
        <span className="h-3 w-px shrink-0 bg-zinc-300" aria-hidden="true" />

        <div className="relative h-10 min-w-0 flex-1">
          {ITEMS.map((item, itemIndex) => (
            <p
              key={item}
              aria-hidden={itemIndex !== index}
              className={`absolute inset-0 flex items-center text-xs text-zinc-600 transition-all duration-500 ease-out motion-reduce:transition-none ${itemIndex === index
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0"
                }`}
            >
              <span className="truncate">{item}</span>
            </p>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {ITEMS[index]}
        </p>

        <a
          href="#events"
          className="group hidden shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-900 transition-colors duration-200 ease-out hover:text-zinc-600 sm:flex"
        >
          View updates
          <ArrowRight className="h-3 w-3 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </a>
      </div>
    </div>
  );
}
