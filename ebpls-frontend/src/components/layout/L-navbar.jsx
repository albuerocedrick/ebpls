import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import logo from "../../assets/logo.png";
import { ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#liliw-heritage", label: "Local Business" },
  { href: "#events", label: "Updates" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white/85 backdrop-blur-md transition-all duration-300 ease-out motion-reduce:transition-none ${scrolled ? "border-zinc-200 shadow-sm" : "border-transparent"
        }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 ease-out motion-reduce:transition-none sm:px-6 lg:px-8 ${scrolled ? "h-14" : "h-16"
          }`}
      >
        <Link to="/" className="group flex items-center gap-2.5">
          <img
            src={logo}
            alt="Official seal of Liliw, Laguna"
            className="h-8 w-8 object-contain transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none"
          />
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            Liliw e-BPLS
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative px-3 py-2 text-sm text-zinc-600 transition-colors duration-200 hover:text-zinc-900"
            >
              {link.label}
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-zinc-900 transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
              />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            to={ROUTES.LOGIN}
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors duration-200 hover:text-zinc-900"
          >
            Sign in
          </Link>
          <Link
            to={ROUTES.REGISTER}
            className="group flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-zinc-800 active:scale-[0.98] motion-reduce:transition-none"
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
          className="rounded-md p-2 text-zinc-700 transition-colors duration-200 hover:bg-zinc-100 md:hidden"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={`grid overflow-hidden border-zinc-200 bg-white transition-all duration-300 ease-out motion-reduce:transition-none md:hidden ${mobileOpen
            ? "grid-rows-[1fr] border-t opacity-100"
            : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 py-4">
            <nav className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-2 py-2.5 text-sm text-zinc-700 transition-colors duration-150 hover:bg-zinc-50"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="mt-3 flex flex-col gap-2 border-t border-zinc-200 pt-3">
              <Link
                to={ROUTES.LOGIN}
                onClick={() => setMobileOpen(false)}
                className="rounded-md border border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-zinc-800 transition-colors duration-200 hover:bg-zinc-50"
              >
                Sign in
              </Link>
              <Link
                to={ROUTES.REGISTER}
                onClick={() => setMobileOpen(false)}
                className="rounded-md bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors duration-200 hover:bg-zinc-800"
              >
                Apply online
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
