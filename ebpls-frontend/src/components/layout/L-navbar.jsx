import { useEffect, useState, useRef } from "react";
import { gsap } from "../../lib/gsap";
import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import logo from "../../assets/logo.png";


export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef();

  // Load Animation
  useEffect(() => {
    gsap.fromTo(navRef.current,
      { y: -100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "expo.out", delay: 0.2 }
    );
  }, []);

  // Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header
      ref={navRef}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/70 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.05)] border-b border-white/20 py-2"
          : "bg-transparent py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* LOGO */}
        <div
          onClick={scrollToTop}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <img src={logo} alt="BOSS Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <span className="font-black text-slate-900 text-xl tracking-tight">BOSS</span>
        </div>

        {/* NAV LINKS */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-blue-600 transition-colors">Platform</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
        </nav>

        {/* ACTION BUTTONS */}
        <div className="flex gap-4 items-center">
          <Link 
            to={ROUTES.LOGIN}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block"
          >
            Sign In
          </Link>
          <Link 
            to={ROUTES.REGISTER}
            className="bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-slate-800 transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}