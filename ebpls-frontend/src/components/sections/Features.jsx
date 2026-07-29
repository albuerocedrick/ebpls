import React, { useEffect, useRef } from "react";
import { gsap } from "../../lib/gsap";
import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import {
  FileSpreadsheet,
  Calculator,
  ShieldCheck,
  QrCode,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: FileSpreadsheet,
    title: "Unified application form",
    desc: "One digital form covers new business filing and annual renewal, saved as you go.",
    action: "Open the form",
    route: ROUTES.REGISTER,
  },
  {
    step: "02",
    icon: Calculator,
    title: "Automated tax assessment",
    desc: "Mayor's permit, sanitary, and business tax fees are itemised before you pay.",
    action: "View assessment",
    route: ROUTES.LOGIN,
  },
  {
    step: "03",
    icon: ShieldCheck,
    title: "Barangay clearance sync",
    desc: "Clearances are verified by the issuing office directly, with no extra hall visits.",
    action: "Check status",
    route: ROUTES.LOGIN,
  },
  {
    step: "04",
    icon: QrCode,
    title: "QR digital permit",
    desc: "The approved permit is issued with a QR code inspectors can verify on site.",
    action: "Get your permit",
    route: ROUTES.LOGIN,
  },
];

export default function Features() {
  const sectionRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        cardsRef.current?.children || [],
        { y: 28, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.09,
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
      id="services"
      className="flex min-h-svh items-center border-b border-zinc-200 bg-zinc-50"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
              E-services workflow
            </span>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-5xl">
              Digital business permit workflow
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-600">
              Every stage follows the Ease of Doing Business Act (RA 11032), so
              you always know which office is holding your papers.
            </p>
          </div>

          <Link
            to={ROUTES.REGISTER}
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
          >
            Start an application
            <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </div>

        <ol
          ref={cardsRef}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((item) => {
            const Icon = item.icon;

            return (
              <li
                key={item.step}
                className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-7 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition-colors duration-300 ease-out group-hover:bg-zinc-900 group-hover:text-white motion-reduce:transition-none">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-2xl font-semibold tracking-tight text-zinc-200 transition-colors duration-300 group-hover:text-zinc-900 motion-reduce:transition-none">
                    {item.step}
                  </span>
                </div>

                <h3 className="mt-7 text-base font-semibold text-pretty text-zinc-900">
                  {item.title}
                </h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-zinc-600">
                  {item.desc}
                </p>

                <Link
                  to={item.route}
                  className="mt-7 inline-flex items-center gap-1.5 border-t border-zinc-100 pt-5 text-sm font-medium text-zinc-900"
                >
                  {item.action}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" />
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="mt-16 flex flex-col gap-6 rounded-xl bg-zinc-900 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">
              Need help with your Liliw business application?
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
              The BPLO desk at Liliw Municipal Hall is open Monday to Friday,
              8:00 AM to 5:00 PM.
            </p>
          </div>
          <a
            href="tel:+63495631201"
            className="shrink-0 rounded-lg bg-white px-5 py-2.5 text-center text-sm font-medium text-zinc-900 transition-all duration-200 ease-out hover:bg-zinc-100 active:scale-[0.98] motion-reduce:transition-none"
          >
            Call (049) 563-1201
          </a>
        </div>
      </div>
    </section>
  );
}
