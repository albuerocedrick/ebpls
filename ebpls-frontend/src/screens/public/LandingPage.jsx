import Navbar from "../../components/layout/L-navbar";
import Hero from "../../components/sections/Hero";
import Features from "../../components/sections/Features";
import Footer from "../../components/layout/Footer";

function LandingPage() {
  return (
    <div className="bg-slate-50 min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;