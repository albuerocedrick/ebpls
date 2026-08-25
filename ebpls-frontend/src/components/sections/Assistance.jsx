/**
 * Assistance.jsx
 * Closing block: how to reach a person, and the final call to action.
 *
 * An online portal still needs a visible human fallback. Applicants who get
 * stuck mid-application are the most likely to abandon it, so the contact
 * details are given their own section rather than being buried in the footer.
 */
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, Mail, MapPin, Phone } from "lucide-react";

import { gsap } from "../../lib/gsap";
import {
  drawLine,
  revealLines,
  revealStagger,
  whenFontsReady,
} from "../../lib/animations";
import { ROUTES } from "../../utils/constants";

const CHANNELS = [
  {
    icon: Phone,
    label: "Telephone",
    value: "(049) 563-1201",
    href: "tel:+63495631201",
  },
  {
    icon: Mail,
    label: "Email",
    value: "bplo@liliwlaguna.gov.ph",
    href: "mailto:bplo@liliwlaguna.gov.ph",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "M.H. del Pilar St., Liliw, 4004 Laguna",
  },
  {
    icon: Clock3,
    label: "Office hours",
    value: "Monday to Friday, 8:00 AM to 5:00 PM",
  },
];

export default function Assistance() {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const leadRef = useRef(null);
  const actionsRef = useRef(null);
  const ruleRef = useRef(null);
  const channelsRef = useRef(null);

  useEffect(() => {
    let cleanupSplit = () => {};
    let cancelled = false;

    const ctx = gsap.context(() => {
      const trigger = {
        trigger: sectionRef.current,
        start: "top 78%",
        toggleActions: "play none none reverse",
      };

      revealStagger([eyebrowRef.current, leadRef.current, actionsRef.current], {
        y: 18,
        stagger: 0.09,
        scrollTrigger: trigger,
      });

      drawLine(ruleRef.current, { trigger: channelsRef.current });

      revealStagger(channelsRef.current?.children, {
        y: 18,
        stagger: 0.08,
        duration: 0.7,
        scrollTrigger: {
          trigger: channelsRef.current,
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
      });

      whenFontsReady().then(() => {
        if (cancelled) return;
        cleanupSplit = revealLines(headingRef.current, {
          stagger: 0.1,
          duration: 1,
          scrollTrigger: trigger,
        });
      });
    }, sectionRef);

    return () => {
      cancelled = true;
      cleanupSplit();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="assistance"
      aria-labelledby="assistance-heading"
      className="bg-zinc-950 text-zinc-400"
    >
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-20 lg:px-8 lg:py-24">
        <div className="lg:col-span-6">
          <span
            ref={eyebrowRef}
            className="will-reveal block font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase"
          >
            Need help?
          </span>
          <h2
            ref={headingRef}
            id="assistance-heading"
            className="will-reveal mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            The licensing desk can walk you through it.
          </h2>
          <p
            ref={leadRef}
            className="will-reveal mt-5 max-w-xl text-sm leading-relaxed text-zinc-400"
          >
            If a requirement is unclear or your application was returned, contact
            the Business Permits and Licensing Office directly. Have your
            application number ready so staff can look it up.
          </p>

          <div
            ref={actionsRef}
            className="will-reveal mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to={ROUTES.REGISTER}
              className="group inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-all duration-300 ease-out hover:bg-zinc-100 active:scale-[0.98] motion-reduce:transition-none"
            >
              Start an application
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
            <a
              href="tel:+63495631201"
              className="rounded-md border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors duration-200 hover:border-zinc-500 hover:text-white"
            >
              Call the BPLO
            </a>
          </div>
        </div>

        {/* Contact details sit beside the copy rather than below it: on a wide
            viewport a full-width row of four leaves the right half of the
            section empty. */}
        <div className="lg:col-span-6 lg:pl-8">
          <div
            ref={ruleRef}
            aria-hidden="true"
            className="hairline h-px w-full scale-x-0 bg-zinc-800"
          />

          <dl ref={channelsRef} className="mt-8 grid gap-8 sm:grid-cols-2">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon;

              return (
                <div key={channel.label} className="will-reveal">
                  <dt className="flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-zinc-500 uppercase">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {channel.label}
                  </dt>
                  <dd className="mt-3 text-sm leading-relaxed text-zinc-200">
                    {channel.href ? (
                      <a
                        href={channel.href}
                        className="link-underline transition-colors duration-300 hover:text-white"
                      >
                        {channel.value}
                      </a>
                    ) : (
                      channel.value
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
