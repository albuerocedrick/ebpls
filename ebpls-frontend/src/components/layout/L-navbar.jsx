import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";

import { gsap, ScrollTrigger } from "../../lib/gsap";
import { prefersReducedMotion, scrollProgress } from "../../lib/animations";
import { useLenisRef, useScrollTo } from "../../lib/lenisContext";
import { ROUTES } from "../../utils/constants";
import logo from "../../assets/logo.png";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#requirements", label: "Requirements" },
  { href: "#local-business", label: "Local business" },
  { href: "#updates", label: "Updates" },
];

/** Height of the sticky header, used as the anchor scroll offset. */
const HEADER_OFFSET = 64;

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const headerRef = useRef(null);
  const navRef = useRef(null);
  const markerRef = useRef(null);
  const progressRef = useRef(null);
  // Anchor tapped while the mobile sheet was open; scrolled once it unlocks.
  const pendingAnchorRef = useRef(null);
  const scrollTo = useScrollTo();
  const lenisRef = useLenisRef();

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Condense the header once the page leaves the very top.
      ScrollTrigger.create({
        start: 8,
        end: "max",
        onToggle: (self) => setScrolled(self.isActive),
      });

      // Reading progress across the whole document.
      scrollProgress(progressRef.current);

      // Highlight the nav link for whichever section owns the viewport middle.
      NAV_LINKS.forEach((link) => {
        const section = document.querySelector(link.href);
        if (!section) return;

        ScrollTrigger.create({
          trigger: section,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => {
            if (self.isActive) setActiveSection(link.href);
            else
              setActiveSection((current) =>
                current === link.href ? null : current,
              );
          },
        });
      });
    }, headerRef);

    return () => ctx.revert();
  }, []);

  /*
   * Slide one shared marker between nav links instead of fading a separate
   * underline per link. Because it is a single element being tweened, the
   * highlight travels continuously as sections change, which is what makes the
   * nav feel connected to the scroll rather than just reacting to it.
   */
  useEffect(() => {
    const marker = markerRef.current;
    const nav = navRef.current;
    if (!marker || !nav) return;

    if (!activeSection) {
      gsap.to(marker, {
        opacity: 0,
        duration: 0.25,
        ease: "power2.out",
        overwrite: "auto",
      });
      return;
    }

    const link = nav.querySelector(`[data-nav="${activeSection}"]`);
    if (!link) return;

    // Offsets are read relative to the nav, which is the marker's containing
    // block, so no page-scroll compensation is needed.
    const target = { x: link.offsetLeft, width: link.offsetWidth };

    if (prefersReducedMotion()) {
      gsap.set(marker, { ...target, opacity: 1 });
      return;
    }

    gsap.to(marker, {
      ...target,
      opacity: 1,
      duration: 0.45,
      ease: "power3.out",
      overwrite: "auto",
    });
  }, [activeSection]);

  // Freeze the page behind the mobile sheet. Lenis owns the scroll position,
  // so it must be stopped explicitly; overflow:hidden alone would not stop it.
  useEffect(() => {
    if (!mobileOpen) return undefined;

    const lenis = lenisRef.current;
    lenis?.stop();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
      // Lenis.start() calls reset(), which snaps targetScroll back to the
      // current position and kills any in-flight tween. So a scroll requested
      // while the sheet was open has to be (re)issued after the unlock.
      lenis?.start();
      const pending = pendingAnchorRef.current;
      pendingAnchorRef.current = null;
      if (pending) {
        scrollTo(pending, {
          offset: -HEADER_OFFSET,
          duration: prefersReducedMotion() ? 0 : 1.1,
        });
      }
    };
  }, [mobileOpen, lenisRef, scrollTo]);

  /**
   * Route in-page anchors through Lenis so they glide instead of jumping.
   * When the mobile sheet is open, the scroll is deferred until the unlock
   * effect above runs — otherwise Lenis.start() would cancel it immediately.
   */
  const handleAnchor = (href) => (event) => {
    event.preventDefault();

    if (mobileOpen) {
      pendingAnchorRef.current = href;
      setMobileOpen(false);
      return;
    }

    scrollTo(href, {
      offset: -HEADER_OFFSET,
      duration: prefersReducedMotion() ? 0 : 1.1,
    });
  };

  /**
   * The header sits over the dark hero photograph at the top of the page, so it
   * stays dark there and only flips to the white sheet once the page has
   * scrolled past. It also flips while the mobile sheet is open, because that
   * panel is white and a dark bar above it would read as a separate element.
   */
  const solid = scrolled || mobileOpen;

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 border-b transition-all duration-500 ease-out motion-reduce:transition-none ${
        solid
          ? "border-zinc-200/80 bg-white/95 shadow-[0_1px_20px_-8px_rgba(24,24,27,0.25)] backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-zinc-950"
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-500 ease-out motion-reduce:transition-none sm:px-6 lg:px-8 ${
          scrolled ? "h-14" : "h-16"
        }`}
      >
        <Link to="/" className="group flex items-center gap-2.5">
          <img
            src={logo}
            alt="Official seal of Liliw, Laguna"
            className="h-8 w-8 object-contain transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none"
          />
          <span
            className={`text-sm font-semibold tracking-tight transition-colors duration-500 motion-reduce:transition-none ${
              solid ? "text-zinc-900" : "text-white"
            }`}
          >
            Business One Stop Shop
          </span>
        </Link>

        {/* `relative` makes this nav the marker's containing block, so the
            marker can be positioned from each link's offsetLeft. */}
        <nav ref={navRef} className="relative hidden items-center gap-0.5 lg:flex">
          <span
            ref={markerRef}
            aria-hidden="true"
            className={`absolute inset-y-1 left-0 -z-10 w-0 rounded-full opacity-0 ${
              solid ? "bg-zinc-100" : "bg-white/10"
            }`}
          />

          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href;

            return (
              <a
                key={link.href}
                href={link.href}
                data-nav={link.href}
                onClick={handleAnchor(link.href)}
                aria-current={isActive ? "true" : undefined}
                className={`relative rounded-full px-3 py-2 text-sm transition-colors duration-300 ${
                  solid
                    ? isActive
                      ? "text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900"
                    : isActive
                      ? "text-white"
                      : "text-zinc-400 hover:text-white"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to={ROUTES.LOGIN}
            className={`rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 ${
              solid
                ? "text-zinc-600 hover:text-zinc-900"
                : "text-zinc-300 hover:text-white"
            }`}
          >
            Sign in
          </Link>
          {/* Inverts with the header: a zinc-900 pill would disappear into the
              dark bar over the hero. */}
          <Link
            to={ROUTES.REGISTER}
            className={`sheen group relative flex items-center gap-1.5 overflow-hidden rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-out active:scale-[0.98] motion-reduce:transition-none ${
              solid
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "sheen-dark bg-white text-zinc-900 hover:bg-zinc-200"
            }`}
          >
            Apply online
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          className={`rounded-full p-2 transition-colors duration-200 lg:hidden ${
            solid
              ? "text-zinc-700 hover:bg-zinc-100"
              : "text-zinc-200 hover:bg-white/10"
          }`}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Reading progress. Sits on the header's bottom border so it reads as
          the border filling in rather than as an extra bar. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-px h-px overflow-hidden"
      >
        <div
          ref={progressRef}
          className={`hairline h-full w-full scale-x-0 ${
            solid
              ? "bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-400"
              : "bg-gradient-to-r from-white via-zinc-400 to-transparent"
          }`}
        />
      </div>

      {/* Mobile sheet.
          Positioned absolutely under the header rather than sitting in normal
          flow. In flow, collapsing the sheet changed the document height while
          Lenis was mid-tween, so a tapped anchor overshot by roughly the sheet
          height. As an overlay it causes no layout shift, so the anchor target
          is measured at its final position.

          `inert` keeps the hidden panel out of the tab order and off the
          accessibility tree — opacity alone would leave its links focusable. */}
      <div
        id="mobile-nav"
        inert={!mobileOpen}
        className={`absolute inset-x-0 top-full origin-top border-zinc-200 bg-white transition-all duration-300 ease-out motion-reduce:transition-none lg:hidden ${
          mobileOpen
            ? "pointer-events-auto translate-y-0 border-t opacity-100 shadow-[0_24px_48px_-24px_rgba(24,24,27,0.35)]"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="px-4 py-5">
          <nav className="flex flex-col">
            {NAV_LINKS.map((link, linkIndex) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleAnchor(link.href)}
                aria-current={activeSection === link.href ? "true" : undefined}
                // Each row trails the one above it, so the sheet unfolds
                // instead of appearing all at once. Delays are cleared on
                // close so the sheet dismisses immediately.
                style={{
                  transitionDelay: mobileOpen ? `${90 + linkIndex * 55}ms` : "0ms",
                }}
                className={`flex items-baseline gap-3 rounded-lg px-2 py-3 text-base transition-all duration-300 ease-out hover:bg-zinc-50 motion-reduce:transition-none ${
                  mobileOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-1 opacity-0"
                } ${
                  activeSection === link.href
                    ? "font-medium text-zinc-900"
                    : "text-zinc-700"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-[10px] text-zinc-400"
                >
                  {String(linkIndex + 1).padStart(2, "0")}
                </span>
                {link.label}
              </a>
            ))}
          </nav>

          <div
            style={{ transitionDelay: mobileOpen ? "255ms" : "0ms" }}
            className={`mt-4 flex flex-col gap-2 border-t border-zinc-200 pt-4 transition-all duration-300 ease-out motion-reduce:transition-none ${
              mobileOpen ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
            }`}
          >
            <Link
              to={ROUTES.LOGIN}
              onClick={() => setMobileOpen(false)}
              className="rounded-full border border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-800 transition-colors duration-200 hover:bg-zinc-50"
            >
              Sign in
            </Link>
            <Link
              to={ROUTES.REGISTER}
              onClick={() => setMobileOpen(false)}
              className="rounded-full bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
            >
              Apply online
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
