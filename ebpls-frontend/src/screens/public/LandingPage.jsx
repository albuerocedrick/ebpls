import React from "react";
import { LenisWrapper } from "../../lib/lenis";
import AnnouncementsTicker from "../../components/sections/AnnouncementsTicker";
import Navbar from "../../components/layout/L-navbar";
import Hero from "../../components/sections/Hero";
import EventsSlider from "../../components/sections/EventsSlider";
import LiliwHeritage from "../../components/sections/LiliwHeritage";
import Features from "../../components/sections/Features";
import Footer from "../../components/layout/Footer";

function LandingPage() {
  return (
    <LenisWrapper>
      <div className="bg-white min-h-screen flex flex-col overflow-x-hidden selection:bg-zinc-900 selection:text-white font-sans">
        <AnnouncementsTicker />
        <Navbar />
        <main className="flex-1">
          <Hero />
          <EventsSlider />
          <LiliwHeritage />
          <Features />
        </main>
        <Footer />
      </div>
    </LenisWrapper>
  );
}

export default LandingPage;