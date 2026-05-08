import { useEffect, useRef } from "react";
import { gsap } from "../../lib/gsap";
import { Zap, ShieldCheck, Clock, FileText, Activity, Smartphone } from "lucide-react";

export default function Features() {
  const sectionRef = useRef();
  const headerRef = useRef();
  const cardsRef = useRef([]);
  const parallaxBg = useRef();

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Parallax Background Orb
      gsap.to(parallaxBg.current, {
        yPercent: 30, 
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true, 
        },
      });

      // 2. Header Reveal
      gsap.fromTo(
        headerRef.current.children,
        { y: 40, opacity: 0, filter: "blur(8px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 1.2,
          stagger: 0.2,
          ease: "expo.out",
          scrollTrigger: {
            trigger: headerRef.current,
            start: "top 80%",
            toggleActions: "play reset restart none",
          },
        }
      );

      // 3. PREMIUM CARD REVEAL (3D Hinge + Blur + Grid Stagger)
      gsap.fromTo(
        cardsRef.current,
        { 
          y: 80, 
          opacity: 0, 
          scale: 0.9,
          rotationX: -15, // Starts slightly tilted away
          transformPerspective: 1000, // Gives the rotation a 3D depth
          filter: "blur(12px)" // Starts blurry
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          rotationX: 0, // Snaps flat
          filter: "blur(0px)", // Snaps into focus
          duration: 1.2,
          ease: "expo.out",
          immediateRender: false,
          stagger: {
            amount: 0.6, // Total time spread across all cards
            grid: [2, 3], // Tells GSAP how the cards are laid out
            from: "start" // Animates from top-left to bottom-right
          },
          scrollTrigger: {
            trigger: cardsRef.current[0], 
            start: "top 85%",
            toggleActions: "play reset restart none",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: <Zap className="w-6 h-6 text-blue-600" />,
      title: "Lightning Fast Processing",
      desc: "Submit and process permits in minutes with our automated workflow engine.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      title: "Bank-Grade Security",
      desc: "Your data and documents are protected with advanced end-to-end encryption.",
    },
    {
      icon: <Clock className="w-6 h-6 text-indigo-500" />,
      title: "24/7 Portal Access",
      desc: "Access your business records, pay fees, and print permits anytime, anywhere.",
    },
    {
      icon: <FileText className="w-6 h-6 text-amber-500" />,
      title: "Paperless Records",
      desc: "Centralize your compliance documents with zero physical paperwork required.",
    },
    {
      icon: <Activity className="w-6 h-6 text-rose-500" />,
      title: "Real-time Analytics",
      desc: "Monitor your application status and track performance metrics live.",
    },
    {
      icon: <Smartphone className="w-6 h-6 text-cyan-500" />,
      title: "Mobile Optimized",
      desc: "A fully responsive dashboard that looks and works perfectly on any device.",
    },
  ];

  return (
    <section ref={sectionRef} className="relative w-full bg-slate-50 overflow-hidden py-32">
      {/* Subtle Parallax Background Element */}
      <div 
        ref={parallaxBg}
        className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-blue-100/50 to-indigo-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/4 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header Area */}
        <div ref={headerRef} className="text-center max-w-3xl mx-auto">
          <h2 className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-3">
            System Capabilities
          </h2>
          <h3 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Built for modern <br /> digital governance.
          </h3>
          <p className="mt-6 text-lg text-slate-600">
            Everything you need to manage business permits securely, track applications in real-time, and eliminate manual bottlenecks.
          </p>
        </div>

        {/* Grid Area */}
        <div className="mt-24 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item, i) => (
            <div
              key={i}
              ref={(el) => (cardsRef.current[i] = el)}
              // Will-change helps the browser optimize the 3D transforms and blur
              className="group bg-white/60 backdrop-blur-md border border-slate-200/60 p-8 rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer will-change-transform"
            >
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                {item.icon}
              </div>
              <h4 className="font-bold text-xl text-slate-900 mb-3">
                {item.title}
              </h4>
              <p className="text-slate-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}