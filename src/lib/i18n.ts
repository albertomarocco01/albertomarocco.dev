// Hand-rolled EN/IT localization. No i18n library, no [lang] routing, no
// middleware: the active locale is read from a `locale` cookie on the server
// (defaulting to English, the canonical language) and the matching dictionary
// is threaded to components as a prop. Proper nouns and tech/brand tokens
// (names, "webgl", "touchdesigner", "led", years, the email, the domain,
// "P.IVA") stay untranslated on purpose.

import { cookies } from "next/headers";

export type Locale = "en" | "it";
export const DEFAULT_LOCALE: Locale = "en";

/** Translatable text for one work row, keyed by the work `id`. */
export interface WorkText {
  description: string;
  cue: string;
}

export interface Dictionary {
  nav: {
    skip: string;
    work: string;
    about: string;
    contact: string;
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
  ticker: string[];
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
  };
  footer: {
    vat: string;
    instagram: string;
  };
}

const en: Dictionary = {
  nav: {
    skip: "skip to work",
    work: "work",
    about: "about",
    contact: "contact",
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
  ticker: [
    "generative visuals",
    "full-stack web",
    "led walls",
    "webgl / webgpu",
    "touchdesigner",
    "based in turin",
    "available 2026",
  ],
  work: {
    aria: "Work",
    sections: {
      websites: "websites",
      graphic: "graphic design",
      experiments: "xperiments",
    },
    items: {
      "vini-montarello": {
        description:
          "Winery brand & e-commerce. Full-stack build, slow scroll, product as ritual.",
        cue: "visit site",
      },
      "merge-graphic-designs": {
        description:
          "Selected graphic design — identities, posters, type. A merged set, viewable in one place.",
        cue: "open gallery",
      },
      "liminal-field": {
        description:
          "Real-time generative loop for a 6×3m LED wall — domain-warped noise field, painted live by the shared WebGL canvas.",
        cue: "live · webgl",
      },
      "aura-loops": {
        description:
          "Seamless ambient loops, prototyped in shader and finished in TouchDesigner for the install.",
        cue: "live · webgl",
      },
      "studio-next": {
        description:
          "Physics-based web experience, in progress — Next.js + React Three Fiber.",
        cue: "coming soon",
      },
    },
  },
  about: {
    label: "about",
    body: "Computer Science graduate (University of Turin, 2025) working at the seam between web engineering and immersive visuals. I make sites that perform and installations that breathe — and this one runs my own generative work, live, as the proof.",
  },
  footer: {
    vat: "P.IVA — placeholder",
    instagram: "instagram ↗",
  },
};

const it: Dictionary = {
  nav: {
    skip: "salta ai lavori",
    work: "lavori",
    about: "about",
    contact: "contatti",
  },
  locale: {
    label: "lingua",
    en: "Inglese",
    it: "Italiano",
  },
  hero: {
    eyebrow: "full-stack developer & creative technologist, torino",
    lede: "Costruisco interfacce web ad alte prestazioni e visual generative — dove il codice solido incontra la grafica in tempo reale, per schermi e led wall.",
  },
  loader: {
    tag: "caricamento",
  },
  ticker: [
    "visual generative",
    "web full-stack",
    "led wall",
    "webgl / webgpu",
    "touchdesigner",
    "con base a torino",
    "disponibile 2026",
  ],
  work: {
    aria: "Lavori",
    sections: {
      websites: "websites",
      graphic: "graphic design",
      experiments: "xperiments",
    },
    items: {
      "vini-montarello": {
        description:
          "Brand vinicolo & e-commerce. Sviluppo full-stack, scroll lento, il prodotto come rito.",
        cue: "visita il sito",
      },
      "merge-graphic-designs": {
        description:
          "Grafica selezionata — identità, manifesti, type. Una raccolta unita, in un solo posto.",
        cue: "apri la gallery",
      },
      "liminal-field": {
        description:
          "Loop generativo in tempo reale per un led wall 6×3m — campo di noise domain-warped, dipinto dal vivo dal canvas WebGL condiviso.",
        cue: "live · webgl",
      },
      "aura-loops": {
        description:
          "Loop ambient continui, prototipati in shader e rifiniti in TouchDesigner per l'installazione.",
        cue: "live · webgl",
      },
      "studio-next": {
        description:
          "Esperienza web basata sulla fisica, in corso — Next.js + React Three Fiber.",
        cue: "in arrivo",
      },
    },
  },
  about: {
    label: "about",
    body: "Laureato in Informatica (Università di Torino, 2025), lavoro nel punto d'incontro tra ingegneria web e visual immersive. Realizzo siti che performano e installazioni che respirano — e questo fa girare dal vivo il mio lavoro generativo, come prova.",
  },
  footer: {
    vat: "P.IVA — placeholder",
    instagram: "instagram ↗",
  },
};

const dictionaries: Record<Locale, Dictionary> = { en, it };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "it";
}

/**
 * Read the active locale from the `locale` cookie, validated against the
 * supported set and falling back to {@link DEFAULT_LOCALE}. Awaiting
 * `cookies()` (async in this Next.js) opts the route into dynamic rendering —
 * expected and acceptable here.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get("locale")?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
