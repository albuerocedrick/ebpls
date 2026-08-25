/**
 * Footer.jsx
 * Site-wide footer for the public landing page.
 *
 * Deliberately compact: the Assistance section immediately above already
 * carries the contact details and the closing call to action, so repeating them
 * here would only push the legal notices further down. This is a sitemap and
 * attribution bar, nothing more.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";

import { gsap } from "../../lib/gsap";
import { revealStagger } from "../../lib/animations";
import { useScrollTo } from "../../lib/lenisContext";
import { ROUTES } from "../../utils/constants";
import logo from "../../assets/logo.png";

const COLUMNS = [
  {
    heading: "Services",
    links: [
      { label: "New business filing", to: ROUTES.REGISTER },
      { label: "Permit renewal", to: ROUTES.LOGIN },
      { label: "Pay an assessment", to: ROUTES.LOGIN },
      { label: "Business retirement", to: ROUTES.LOGIN },
    ],
  },
  {
    heading: "On this page",
    links: [
      { label: "Online services", href: "#services" },
      { label: "The process", href: "#process" },
      { label: "Requirements", href: "#requirements" },
      { label: "Announcements", href: "#updates" },
    ],
  },
  {
    heading: "Account",
    links: [
      { label: "Sign in", to: ROUTES.LOGIN },
      { label: "Create an account", to: ROUTES.REGISTER },
      { label: "Forgot password", to: ROUTES.FORGOT_PASSWORD },
    ],
  },
];

export default function Footer() {
  const footerRef = useRef(null);
  const columnsRef = useRef(null);

  const scrollTo = useScrollTo();

  useEffect(() => {
    const ctx = gsap.context(() => {
      revealStagger(columnsRef.current?.children, {
        y: 18,
        stagger: 0.08,
        duration: 0.7,
        scrollTrigger: {
          trigger: columnsRef.current,
          start: "top 94%",
          toggleActions: "play none none reverse",
        },
      });
    }, footerRef);

    return () => ctx.revert();
  }, []);

  // Lenis owns the scroll position, so glide rather than jump to the anchor.
  // Offset matches HEADER_OFFSET in L-navbar.
  const handleAnchor = (href) => (event) => {
    event.preventDefault();
    scrollTo(href, { offset: -64 });
  };

  const handleBackToTop = (event) => {
    event.preventDefault();
    scrollTo(0, { duration: 1.4 });
  };

  return (
    <footer
      ref={footerRef}
      className="border-t border-zinc-800 bg-zinc-950 text-zinc-400"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div
          ref={columnsRef}
          className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="will-reveal">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Official seal of Liliw, Laguna"
                className="h-9 w-9 object-contain"
              />
              <span className="text-sm font-semibold tracking-tight text-white">
                Pamahalaang Bayan ng Liliw
              </span>
            </div>
            <p className="mt-4 text-xs leading-relaxed">
              Business Permits and Licensing Office. An official electronic
              service of the Municipality of Liliw, Laguna.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading} className="will-reveal">
              <h2 className="font-mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase">
                {column.heading}
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="link-underline text-sm transition-colors duration-300 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        onClick={handleAnchor(link.href)}
                        className="link-underline text-sm transition-colors duration-300 hover:text-white"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-zinc-800 pt-7 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Pamahalaang Bayan ng Liliw. All rights
            reserved.
          </p>
          {/* A button, not an <a href="#hero">. Lenis installs its own
              document-level handler for hash links (the `anchors` option), which
              would run alongside this one and scroll to the hero minus the
              header offset instead of to the very top. */}
          <button
            type="button"
            onClick={handleBackToTop}
            className="group inline-flex w-fit items-center gap-2 transition-colors duration-300 hover:text-white"
          >
            Back to top
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-zinc-400 motion-reduce:transition-none"
            >
              <ArrowUp className="h-3 w-3" />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
