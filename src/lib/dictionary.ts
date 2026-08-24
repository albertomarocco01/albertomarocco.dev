// Hand-rolled EN/IT localization. No i18n library, no [lang] routing, no
// middleware: the active locale is read from a `locale` cookie on the server
// (defaulting to Italian, the site's primary language) and the matching
// dictionary is threaded to components as a prop. Proper nouns and tech/brand
// tokens (names, "webgl", "touchdesigner", "led", years, the email, the domain,
// "P.IVA") stay untranslated on purpose.
//
// This module is deliberately free of `next/headers` so client components (the
// two error boundaries) can import the dictionaries too. `getLocale()`, which
// reads the cookie and is server-only, lives in ./i18n.ts — which re-exports
// everything here, so `@/lib/i18n` stays the single import for server code.
//
// The two immersive demos under /xperiments keep their copy next to themselves
// (see xperiments/*/copy.ts) — same cookie + dictionary approach, typed against
// `Locale` so parity is still compiler-enforced, but their vocabulary is their
// own and doesn't belong in the site dictionary.

export type Locale = "en" | "it";
export const DEFAULT_LOCALE: Locale = "it";

/** Open Graph `og:locale` value per locale. */
export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  it: "it_IT",
};

/** Translatable text for one work row, keyed by the work `id`. */
export interface WorkText {
  /** the mono meta line under the row title (discipline · tech · year) */
  meta: string;
  description: string;
  cue: string;
  /** alt text for the row's preview image, on the rows that have one */
  alt?: string;
}

/** Translatable text for one graphic-designs demo card, keyed by its `id`. */
export interface DemoText {
  title: string;
  meta: string;
  desc: string;
}

/** Head + heading copy shared by the plain index pages (/websites, /xperiments). */
export interface PageText {
  metaTitle: string;
  metaDescription: string;
  title: string;
  lede: string;
}

export interface Dictionary {
  /** document-level metadata (title stays a brand token) */
  meta: {
    description: string;
  };
  nav: {
    skip: string;
    work: string;
    about: string;
    contact: string;
    /** aria-label for the topbar <nav> landmark */
    primary: string;
    /** the three work routes, spelled out in the topbar */
    websites: string;
    graphic: string;
    xperiments: string;
  };
  locale: {
    /** aria-label for the toggle group */
    label: string;
    /** spoken names for the two buttons */
    en: string;
    it: string;
  };
  hero: {
    eyebrow: string;
    lede: string;
  };
  loader: {
    /** lowercase tag shown beside the progress counter on the loading veil */
    tag: string;
  };
  /** the section teasers revealed by scrolling past the hero on the home page */
  home: {
    /** aria-label for the teaser nav landmark */
    aria: string;
    /** mono cue under every teaser label */
    cue: string;
    teasers: {
      websites: string;
      graphic: string;
      xperiments: string;
    };
  };
  work: {
    /** section landmark label */
    aria: string;
    /** visible label per section, keyed by section id (see WORK_SECTIONS) */
    sections: Record<string, string>;
    items: Record<string, WorkText>;
  };
  about: {
    label: string;
    body: string;
    metaTitle: string;
    metaDescription: string;
    title: string;
    /** the contact block that closes /about */
    contactLabel: string;
    contactBody: string;
  };
  /** the /websites index */
  websites: PageText;
  /** the /xperiments index */
  xperiments: PageText;
  footer: {
    vat: string;
    instagram: string;
  };
  /** route-level error boundary for the main site */
  error: {
    label: string;
    title: string;
    body: string;
    retry: string;
    /** label before the error digest */
    ref: string;
  };
  /** the /graphic-designs index */
  gd: {
    metaTitle: string;
    metaDescription: string;
    back: string;
    label: string;
    title: string;
    lede: string;
    /** call to action on each demo card */
    cta: string;
    /** per-demo copy, keyed by demo id (see the DEMOS list on that page) */
    demos: Record<string, DemoText>;
  };
}

const en: Dictionary = {
  meta: {
    description:
      "Creative technologist & full-stack developer in Turin — high-performance web interfaces and real-time generative visuals, for screens and LED walls alike.",
  },
  nav: {
    skip: "skip to content",
    work: "work",
    about: "about",
    contact: "contact",
    primary: "primary",
    websites: "websites",
    graphic: "graphic designs",
    xperiments: "xperiments",
  },
  locale: {
    label: "language",
    en: "English",
    it: "Italian",
  },
  hero: {
    eyebrow: "full-stack developer & creative technologist based in Turin",
    lede: "I build high-performance web interfaces and generative visuals — where robust code meets real-time graphics, for screens and LED walls alike.",
  },
  loader: {
    tag: "loading",
  },
  home: {
    aria: "Sections",
    cue: "open",
    teasers: {
      websites: "Websites",
      graphic: "Merge Graphic Designs",
      xperiments: "XPERIMENTS",
    },
  },
  work: {
    aria: "Work",
    sections: {
      websites: "websites",
      graphic: "graphic design",
      experiments: "xperiments",
    },
    items: {
      "vini-montarello": {
        meta: "web · 2025",
        description:
          "Winery brand & e-commerce. Full-stack build, slow scroll, product as ritual.",
        cue: "visit site",
        alt: "Vini Montarello homepage — vineyards in the Monferrato hills behind the winery's wordmark",
      },
      "toretto-blend": {
        meta: "web · 2024",
        description:
          "Spirits brand site — Mediterranean meets Jamaica. Cinematic video hero, age gate, drinks & stockists.",
        cue: "visit site",
        alt: "Toretto Blend homepage — the embossed bottle label lit in amber, reading RUM Jamaica & Liquore ai fiori d'arancio",
      },
      "merge-graphic-designs": {
        meta: "graphic · 2025",
        description:
          "Selected graphic design — identities, posters, type. A merged set, viewable in one place.",
        cue: "open gallery",
      },
      "liminal-field": {
        meta: "installation · led · 2025",
        description:
          "Real-time generative loop for a 6×3m LED wall — domain-warped noise field, painted live by the shared WebGL canvas.",
        cue: "live · webgl",
      },
      "aura-loops": {
        meta: "generative · touchdesigner · 2024",
        description:
          "Seamless ambient loops, prototyped in shader and finished in TouchDesigner for the install.",
        cue: "live · webgl",
      },
      "studio-next": {
        meta: "web · soon",
        description:
          "Physics-based web experience, in progress — Next.js + React Three Fiber.",
        cue: "coming soon",
      },
    },
  },
  about: {
    label: "about",
    body: "Computer Science graduate (University of Turin, 2025) working at the seam between web engineering and immersive visuals. I make sites that perform and installations that breathe — and this one runs my own generative work, live, as the proof.",
    metaTitle: "About",
    metaDescription:
      "Creative technologist and full-stack developer in Turin — web engineering, real-time visuals, and how to get in touch.",
    title: "About",
    contactLabel: "contact",
    contactBody:
      "Open to collaborations and commissions from 2026 — web, installations, LED. Write, or find me on Instagram.",
  },
  websites: {
    metaTitle: "Websites",
    metaDescription:
      "Full-stack websites — design, code and motion in one pass. Built to a performance budget, never from a template.",
    title: "Websites",
    lede: "Sites built end to end — design, code and motion in one pass. Slow scroll, real performance budgets, no template underneath.",
  },
  xperiments: {
    metaTitle: "XPERIMENTS",
    metaDescription:
      "Real-time generative work — shaders, LED walls, installations, each one painted live in the browser.",
    title: "XPERIMENTS",
    lede: "Real-time generative work — shaders, LED walls, installations. Each one is painted live by the shared WebGL canvas: open a row to watch it run.",
  },
  footer: {
    vat: "P.IVA — placeholder",
    instagram: "instagram ↗",
  },
  error: {
    label: "error",
    title: "Something broke on the way here.",
    body: "The page failed to render. Trying again usually fixes it — the cause is most often a stale script from a previous version of the site.",
    retry: "↻ try again",
    ref: "ref",
  },
  gd: {
    metaTitle: "Merge — Graphic Designs",
    metaDescription:
      "Selected graphic work, merged into interactive demos. Open one to explore it in the browser.",
    back: "← back",
    label: "graphic design",
    title: "Merge — Graphic Designs",
    lede: "Selected graphic work, merged into interactive demos. Open one to explore it.",
    cta: "enter demo",
    demos: {
      vortex: {
        title: "Image Vortex",
        meta: "interactive · webgl · 2026",
        desc: "A rotating vortex of graphic work. Pick a card, spin the carousel of selections, then open the scattered gallery.",
      },
      tarassaco: {
        title: "Tarassaco — Dandelion Wind",
        meta: "interactive · breath + face · 2026",
        desc: "Blow into your microphone and an editorial poem scatters like dandelion seeds — breath and face tracked live, entirely in your browser.",
      },
    },
  },
};

const it: Dictionary = {
  meta: {
    description:
      "Creative technologist & full-stack developer a Torino — interfacce web ad alte prestazioni e visual generative in tempo reale, per schermi e led wall.",
  },
  nav: {
    skip: "salta al contenuto",
    work: "lavori",
    about: "about",
    contact: "contatti",
    primary: "principale",
    websites: "siti",
    graphic: "graphic designs",
    xperiments: "xperiments",
  },
  locale: {
    label: "lingua",
    en: "Inglese",
    it: "Italiano",
  },
  hero: {
    eyebrow: "full-stack developer & creative technologist, da torino",
    lede: "Costruisco interfacce web ad alte prestazioni e visual generative — dove il codice solido incontra la grafica in tempo reale, per schermi e led wall.",
  },
  loader: {
    tag: "caricamento",
  },
  home: {
    aria: "Sezioni",
    cue: "apri",
    teasers: {
      websites: "Siti web",
      graphic: "Merge Graphic Designs",
      xperiments: "XPERIMENTS",
    },
  },
  work: {
    aria: "Lavori",
    sections: {
      websites: "siti web",
      graphic: "graphic design",
      experiments: "xperiments",
    },
    items: {
      "vini-montarello": {
        meta: "web · 2025",
        description:
          "Brand vinicolo & e-commerce. Sviluppo full-stack, scroll lento, il prodotto come rito.",
        cue: "visita il sito",
        alt: "Homepage di Vini Montarello — i vigneti delle colline del Monferrato dietro il logotipo della cantina",
      },
      "toretto-blend": {
        meta: "web · 2024",
        description:
          "Sito di brand per uno spirit — il Mediterraneo che incontra la Giamaica. Hero video cinematografico, age gate, drink e punti vendita.",
        cue: "visita il sito",
        alt: "Homepage di Toretto Blend — l'etichetta in rilievo della bottiglia illuminata d'ambra, con la scritta RUM Jamaica & Liquore ai fiori d'arancio",
      },
      "merge-graphic-designs": {
        meta: "grafica · 2025",
        description:
          "Grafica selezionata — identità, manifesti, caratteri. Una raccolta unica, da sfogliare in un solo posto.",
        cue: "apri la gallery",
      },
      "liminal-field": {
        meta: "installazione · led · 2025",
        description:
          "Loop generativo in tempo reale per un led wall 6×3m — campo di noise domain-warped, dipinto dal vivo dal canvas WebGL condiviso.",
        cue: "live · webgl",
      },
      "aura-loops": {
        meta: "generativa · touchdesigner · 2024",
        description:
          "Loop ambient continui, prototipati in shader e rifiniti in TouchDesigner per l'installazione.",
        cue: "live · webgl",
      },
      "studio-next": {
        meta: "web · presto",
        description:
          "Esperienza web basata sulla fisica, in lavorazione — Next.js + React Three Fiber.",
        cue: "in arrivo",
      },
    },
  },
  about: {
    label: "about",
    body: "Laureato in Informatica (Università di Torino, 2025), lavoro nel punto d'incontro tra ingegneria web e visual immersive. Realizzo siti che rendono e installazioni che respirano — e questo sito manda in scena dal vivo il mio lavoro generativo: è la prova.",
    metaTitle: "About",
    metaDescription:
      "Creative technologist e full-stack developer a Torino — ingegneria web, visual in tempo reale, e come mettersi in contatto.",
    title: "About",
    contactLabel: "contatti",
    contactBody:
      "Aperto a collaborazioni e commissioni dal 2026 — web, installazioni, led. Scrivimi, oppure trovami su Instagram.",
  },
  websites: {
    metaTitle: "Siti web",
    metaDescription:
      "Siti full-stack — design, codice e motion in un unico passaggio. Costruiti su un budget di performance, mai da un template.",
    title: "Siti web",
    lede: "Siti costruiti da capo a fondo — design, codice e motion in un unico passaggio. Scroll lento, budget di performance veri, nessun template sotto.",
  },
  xperiments: {
    metaTitle: "XPERIMENTS",
    metaDescription:
      "Lavoro generativo in tempo reale — shader, led wall, installazioni, dipinti dal vivo nel browser.",
    title: "XPERIMENTS",
    lede: "Lavoro generativo in tempo reale — shader, led wall, installazioni. Ognuno è dipinto dal vivo dal canvas WebGL condiviso: apri una riga per vederlo girare.",
  },
  footer: {
    vat: "P.IVA — placeholder",
    instagram: "instagram ↗",
  },
  error: {
    label: "errore",
    title: "Qualcosa si è rotto lungo la strada.",
    body: "La pagina non è riuscita a caricarsi. Riprovare in genere basta — di solito la causa è uno script rimasto da una versione precedente del sito.",
    retry: "↻ riprova",
    ref: "rif",
  },
  gd: {
    metaTitle: "Merge — Graphic Designs",
    metaDescription:
      "Una selezione di lavori grafici, riuniti in demo interattive. Aprine una per esplorarla nel browser.",
    back: "← indietro",
    label: "graphic design",
    title: "Merge — Graphic Designs",
    lede: "Una selezione di lavori grafici, riuniti in demo interattive. Aprine una per esplorarla.",
    cta: "entra nella demo",
    demos: {
      vortex: {
        title: "Image Vortex",
        meta: "interattivo · webgl · 2026",
        desc: "Un vortice rotante di lavori grafici. Scegli una carta, fai girare il carosello delle selezioni, poi apri la gallery sparsa nello spazio.",
      },
      tarassaco: {
        title: "Tarassaco — Dandelion Wind",
        meta: "interattivo · fiato + volto · 2026",
        desc: "Soffia nel microfono e una poesia editoriale si disperde come i semi di un tarassaco — fiato e volto tracciati dal vivo, tutto nel tuo browser.",
      },
    },
  },
};

const dictionaries: Record<Locale, Dictionary> = { en, it };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/** Narrow an arbitrary cookie / `lang` attribute value to a supported locale. */
export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "it";
}
