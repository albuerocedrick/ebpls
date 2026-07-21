import { useEffect, useRef } from "react";
import { gsap } from "../../lib/gsap";

export default function Footer() {
  const footerRef = useRef();
  const contentRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Staggered reveal for footer columns
      gsap.fromTo(contentRef.current, 
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 90%",
            toggleActions: "play reverse play reverse",
          },
        }
      );
    }, footerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={footerRef} className="w-full bg-slate-950 text-slate-300 pt-24 pb-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        
        {/* Brand Column */}
        <div ref={(el) => (contentRef.current[0] = el)} className="md:col-span-2">
          <h3 className="text-2xl font-black text-white tracking-tight mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-lg"></div>
            BOSS
          </h3>
          <p className="text-slate-400 leading-relaxed max-w-sm">
            Streamlining administrative workflows and centralizing public records with state-of-the-art digital infrastructure.
          </p>
        </div>

        {/* Links Column 1 */}
        <div ref={(el) => (contentRef.current[1] = el)}>
          <h4 className="font-bold text-white mb-6 tracking-wide text-sm uppercase">Platform</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors">New Application</a></li>
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Track Status</a></li>
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Renewals</a></li>
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Dashboard</a></li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div ref={(el) => (contentRef.current[2] = el)}>
          <h4 className="font-bold text-white mb-6 tracking-wide text-sm uppercase">Support</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Help Center</a></li>
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Contact Directory</a></li>
            <li><a href="#" className="text-slate-400 hover:text-white transition-colors">System Status</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div 
        ref={(el) => (contentRef.current[3] = el)}
        className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <p className="text-sm text-slate-500 font-medium">
          © {new Date().getFullYear()} BOSS Portal. All rights reserved.
        </p>
        <div className="flex gap-6 text-sm text-slate-500 font-medium">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}