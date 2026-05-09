import { useEffect, useRef } from "react";
import { gsap } from "../../lib/gsap";

export default function Hero() {
  const sectionRef = useRef();
  const title = useRef();
  const desc = useRef();
  const cards = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(
        [title.current, desc.current, ...cards.current, ".hero-btn"],
        {
          clearProps: "all",
        }
      );

      const tl = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reset",
        },
      });

      tl.from(title.current, {
        y: 40,
        opacity: 0,
        duration: 0.8,
      })

        .from(
          desc.current,
          {
            y: 25,
            opacity: 0,
            duration: 0.6,
          },
          "-=0.4"
        )

        .from(
          ".hero-btn",
          {
            y: 20,
            opacity: 0,
            stagger: 0.1,
            duration: 0.5,
          },
          "-=0.3"
        )

        .from(
          cards.current,
          {
            y: 40,
            opacity: 0,
            stagger: 0.12,
            duration: 0.7,
          },
          "-=0.4"
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="w-full min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100"
    >
      <div className="max-w-7xl mx-auto px-6 py-32 flex flex-col lg:flex-row items-center justify-between gap-16">
        
        {/* LEFT CONTENT */}
        <div className="w-full lg:w-1/2 max-w-2xl">
          <h1
            ref={title}
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-tight"
          >
            Get Your Business Permit{" "}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Online
            </span>
          </h1>

          <p
            ref={desc}
            className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl"
          >
            Apply, pay, and manage your permits with ease. No lines, no
            hassle—just a fast, secure digital experience.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button className="hero-btn bg-blue-600 text-white px-7 py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all duration-300">
              Apply Now
            </button>

            <button className="hero-btn text-slate-700 font-semibold hover:text-blue-600 transition-all duration-300">
              Track Application →
            </button>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          <div
            ref={(el) => (cards.current[0] = el)}
            className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl"
          >
            <h3 className="font-bold text-slate-900 text-lg mb-3">
              Fast & Easy
            </h3>

            <p className="text-slate-500 leading-relaxed">
              Submit requirements in minutes without leaving home.
            </p>
          </div>

          <div
            ref={(el) => (cards.current[1] = el)}
            className="bg-white border border-slate-200 p-6 rounded-3xl shadow-xl"
          >
            <h3 className="font-bold text-slate-900 text-lg mb-3">
              Secure
            </h3>

            <p className="text-slate-500 leading-relaxed">
              Your data is protected with enterprise-level security.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}