import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";
import { CONTACT } from "@/lib/contact";
import { InstagramGlyph } from "@/components/chrome/InstagramGlyph";

// Minimal mono footer: P.IVA · contact → · Instagram · email · phone · domain.
// No physical address. The email, the number and the domain are brand tokens
// (kept as-is); the rest comes from the active dictionary. The "contact" link
// is the way to /about's closing panel, which holds every contact in full —
// /about itself renders no footer, that panel is its close.
//
// `curtain` is the home page's variant: the same footer, parked just below the
// bottom edge of the viewport and drawn up over it by downward scroll intent
// (see HomeSequence.tsx and the `html.home-live .foot.curtain` rules). The inner
// wrapper exists for it — once the footer leaves `.wrap` it has to re-create
// that max-width itself.
export function Footer({
  footer,
  curtain = false,
}: {
  footer: Dictionary["footer"];
  curtain?: boolean;
}) {
  return (
    <footer className={`foot${curtain ? " curtain" : ""}`}>
      <div className="foot-inner">
        <span className="vat">{footer.vat}</span>
        <Link href={CONTACT.contactHref} className="foot-contact">
          {footer.contact}
          <span className="arrow" aria-hidden="true">
            →
          </span>
        </Link>
        {/* The app's glyph in place of the old "↗": the icon says "Instagram"
            faster than an arrow says "elsewhere". */}
        <a
          href={CONTACT.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="ig-link"
        >
          {footer.instagram}
          <InstagramGlyph />
        </a>
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        <a href={`tel:${CONTACT.tel}`} aria-label={`${footer.phoneLabel} ${footer.phone}`}>
          {footer.phone}
        </a>
        <span className="spacer" />
        <span className="vat">albertomarocco.dev</span>
      </div>
    </footer>
  );
}
