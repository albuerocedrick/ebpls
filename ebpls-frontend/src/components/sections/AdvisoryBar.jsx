/**
 * AdvisoryBar.jsx
 * Single municipal advisory pinned above the header.
 *
 * One static message rather than a rotating ticker: a deadline notice that
 * cycles away before it is read is worse than no notice at all. If the BPLO has
 * more than one advisory, the Announcements section is where they belong.
 */
import { AlertCircle, ArrowRight } from "lucide-react";

import { useScrollTo } from "../../lib/lenisContext";

const ADVISORY = {
  text: "Annual permit renewal for 2027 opens on 2 January. Filing before 20 January avoids surcharges.",
  linkLabel: "Renewal details",
  linkHref: "#process",
};

export default function AdvisoryBar() {
  const scrollTo = useScrollTo();

  // Route the anchor through Lenis so it glides and clears the sticky header.
  const handleAnchor = (event) => {
    event.preventDefault();
    scrollTo(ADVISORY.linkHref, { offset: -64 });
  };

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 text-zinc-300">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <AlertCircle
          className="mt-0.5 h-3.5 w-3.5 flex-none text-zinc-400 sm:mt-0"
          aria-hidden="true"
        />
        {/* Wraps on narrow viewports rather than truncating: a deadline notice
            cut off at "Filing bef..." conveys nothing. */}
        <p className="min-w-0 flex-1 text-xs leading-relaxed">{ADVISORY.text}</p>
        <a
          href={ADVISORY.linkHref}
          onClick={handleAnchor}
          className="link-underline group hidden shrink-0 items-center gap-1.5 text-xs font-medium text-white sm:flex"
        >
          {ADVISORY.linkLabel}
          <ArrowRight
            className="h-3 w-3 transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
            aria-hidden="true"
          />
        </a>
      </div>
    </div>
  );
}
