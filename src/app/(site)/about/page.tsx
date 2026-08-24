import type { Metadata } from "next";

import { Footer } from "@/components/Footer";
import { getDictionary, getLocale } from "@/lib/i18n";

// `generateMetadata` rather than a static object: the title and description come
// from the active dictionary, so they have to be resolved per request. The route
// is already dynamic (the root layout awaits `cookies()`).
export async function generateMetadata(): Promise<Metadata> {
  const { about } = getDictionary(await getLocale());
  return {
    title: about.metaTitle,
    description: about.metaDescription,
    alternates: { canonical: "/about" },
  };
}

// About + contact, on its own route rather than folded into the footer: the
// footer is now a curtain on the home page and appears on every other one, and
// a 50ch bio does not belong in a one-line mono strip.
export default async function About() {
  const dict = getDictionary(await getLocale());
  const { about } = dict;
  return (
    <>
      <main className="page">
        {/* No mono section label above the title — it would repeat the <h1>. */}
        <header className="page-head">
          <h1 className="page-title">{about.title}</h1>
        </header>
        <p className="about">{about.body}</p>
        <section className="contact">
          <span className="a-label">{about.contactLabel}</span>
          <p className="contact-body">{about.contactBody}</p>
          <ul className="contact-links">
            <li>
              <a href="mailto:albertomarocco.dev@gmail.com">
                albertomarocco.dev@gmail.com
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/alberto.marocco/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {dict.footer.instagram}
              </a>
            </li>
          </ul>
        </section>
      </main>
      <Footer footer={dict.footer} />
    </>
  );
}
