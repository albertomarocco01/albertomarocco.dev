import { Hero } from "@/components/Hero";
import { Ticker } from "@/components/Ticker";
import { WorkRows } from "@/components/work/WorkRows";
import { About } from "@/components/About";
import { Footer } from "@/components/Footer";
import { getDictionary, getLocale } from "@/lib/i18n";

export default async function Home() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return (
    <>
      <Hero hero={dict.hero} />
      <Ticker items={dict.ticker} />
      <section id="work" aria-label={dict.work.aria}>
        <div className="sect-label">
          <span>{dict.work.label}</span>
          <span>{dict.work.years}</span>
        </div>
        <WorkRows items={dict.work.items} />
      </section>
      <About about={dict.about} />
      <Footer footer={dict.footer} />
    </>
  );
}
