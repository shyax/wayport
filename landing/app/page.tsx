import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HeroSceneWrapper from "./components/HeroSceneWrapper";
import Terminal from "./components/Terminal";
import TrustBadges from "./components/TrustBadges";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Pricing from "./components/Pricing";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <section className="relative min-h-screen overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-35">
            <HeroSceneWrapper />
          </div>
          <div
            className="absolute inset-0 z-[1]"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(6,8,15,0.85) 0%, rgba(6,8,15,0.4) 50%, transparent 80%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-48 z-[1]"
            style={{
              background:
                "linear-gradient(to bottom, transparent, var(--color-bg))",
            }}
          />
          <div className="relative z-10">
            <Hero />
          </div>
        </section>
        <Terminal />
        <TrustBadges />
        <hr className="section-divider" />
        <Features />
        <hr className="section-divider" />
        <HowItWorks />
        <hr className="section-divider" />
        <Pricing />
        <hr className="section-divider" />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
