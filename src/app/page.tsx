import { Hero } from "@/components/Hero";
import { Ticker } from "@/components/Ticker";
import { WorkRows } from "@/components/work/WorkRows";
import { About } from "@/components/About";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <section id="work" aria-label="Selected work">
        <div className="sect-label">
          <span>selected work</span>
          <span>2024 — 2025</span>
        </div>
        <WorkRows />
      </section>
      <About />
      <Footer />
    </>
  );
}
