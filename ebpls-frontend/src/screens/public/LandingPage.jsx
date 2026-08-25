/**
 * LandingPage.jsx
 * Public entry point for the Liliw e-BPLS portal.
 *
 * Section order follows what a visitor needs, in the order they need it:
 *   1. Hero            — what this is, plus the two actions most people want
 *   2. ServiceTasks    — pick your transaction
 *   3. ProcessTimeline — what happens after you submit
 *   4. Requirements    — what to prepare first
 *   5. LocalBusiness   — confirmation that your trade is covered
 *   6. Updates         — municipal announcements
 *   7. Assistance      — how to reach a person, and the closing action
 *
 * Note on `overflow-x-clip`: `overflow-x-hidden` would make this wrapper a
 * scroll container, which breaks `position: sticky` on the navbar. `clip`
 * contains any horizontal overflow without creating a scrollport.
 *
 * Note on `data-neutral-focus`: this page is a neutral composition with a dark
 * hero, so the global blue focus ring would be both off-palette and low
 * contrast on it. The attribute switches the ring to `currentColor` for this
 * subtree only (see index.css); the authenticated portals keep the accent ring.
 */
import { LenisWrapper } from "../../lib/lenis";
import AdvisoryBar from "../../components/sections/AdvisoryBar";
import Navbar from "../../components/layout/L-navbar";
import Hero from "../../components/sections/Hero";
import ServiceTasks from "../../components/sections/ServiceTasks";
import ProcessTimeline from "../../components/sections/ProcessTimeline";
import Requirements from "../../components/sections/Requirements";
import LocalBusiness from "../../components/sections/LocalBusiness";
import Updates from "../../components/sections/Updates";
import Assistance from "../../components/sections/Assistance";
import Footer from "../../components/layout/Footer";

function LandingPage() {
  return (
    <LenisWrapper>
      <div
        data-neutral-focus
        className="flex min-h-screen flex-col overflow-x-clip bg-white font-sans selection:bg-zinc-900 selection:text-white"
      >

        <AdvisoryBar />
        <Navbar />
        <main id="main" className="flex-1">
          <Hero />
          <ServiceTasks />
          <ProcessTimeline />
          <Requirements />
          <LocalBusiness />
          <Updates />
          <Assistance />
        </main>
        <Footer />
      </div>
    </LenisWrapper>
  );
}

export default LandingPage;
