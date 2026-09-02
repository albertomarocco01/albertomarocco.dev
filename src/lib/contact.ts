// The contact tokens and the outbound brand links, spelled out once: the
// footer (both variants), /about's contact panel, the dictionaries' phone line
// and the root layout's Person JSON-LD all read from here, so they can never
// drift apart. A data module rather than a component export, so a server
// layout never imports a component file for a string.
export const CONTACT = {
  email: "albertomarocco.dev@gmail.com",
  /** dial form — no spaces, so every phone app parses it */
  tel: "+393896605643",
  /** the number as displayed (footer, /about, JSON-LD) */
  telDisplay: "+39 389 660 5643",
  instagram: "https://www.instagram.com/alberto.marocco/",
  /** the handle as shown on /about's contact panel */
  instagramHandle: "@alberto.marocco",
  /** where the footer's "contact" link lands: /about's closing panel */
  contactHref: "/about#contact",
  /** the calisthenics team's page — linked from /about's second panel */
  baldisthenics: "https://baldisport.com/baldisthenics",
  baldisthenicsLabel: "baldisthenics",
} as const;
