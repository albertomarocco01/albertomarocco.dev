import type { Dictionary } from "@/lib/i18n";

// Minimal mono footer: P.IVA · Instagram · email · domain. No physical address.
// The email and domain are brand tokens (kept as-is); the rest comes from the
// active dictionary.
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
        <a
          href="https://www.instagram.com/alberto.marocco/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {footer.instagram}
        </a>
        <a href="mailto:albertomarocco.dev@gmail.com">
          albertomarocco.dev@gmail.com
        </a>
        <span className="spacer" />
        <span className="vat">albertomarocco.dev</span>
      </div>
    </footer>
  );
}
