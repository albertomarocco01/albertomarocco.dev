import type { Locale } from "./locale";

// The copy the client-only route fallbacks need — the two error boundaries and
// the immersive loading screen. Next hands those components no props, so they
// read the locale off <html lang> (use-locale.ts) and look their strings up
// here. Kept apart from dictionary.ts on purpose: an error boundary is loaded
// with its segment on every page, and importing `getDictionary` there shipped
// both full dictionaries (~13 KB minified, three times over) to every visitor
// for five strings. dictionary.ts composes these into the full dictionaries,
// so there is still one source for each word.

/** Route-level error boundary copy. */
export interface ErrorText {
  label: string;
  title: string;
  body: string;
  retry: string;
  /** label before the error digest */
  ref: string;
}

export const ERROR_COPY: Record<Locale, ErrorText> = {
  en: {
    label: "error",
    title: "Something broke on the way here.",
    body: "The page failed to render. Trying again usually fixes it — the cause is most often a stale script from a previous version of the site.",
    retry: "↻ try again",
    ref: "ref",
  },
  it: {
    label: "errore",
    title: "Qualcosa si è rotto lungo la strada.",
    body: "La pagina non è riuscita a caricarsi. Riprovare in genere basta — di solito la causa è uno script rimasto da una versione precedente del sito.",
    retry: "↻ riprova",
    ref: "rif",
  },
};

/** Lowercase tag beside the loading veil's counter (`dict.loader.tag`) — also
 *  what the immersive demos' loading fallback shows. */
export const LOADER_TAG: Record<Locale, string> = {
  en: "loading",
  it: "caricamento",
};
