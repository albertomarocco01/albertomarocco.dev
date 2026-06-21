import type { Dictionary } from "@/lib/i18n";

// Minimal mono footer: P.IVA · Instagram · email · domain. No physical address.
// The email and domain are brand tokens (kept as-is); the rest comes from the
// active dictionary.
export function Footer({ footer }: { footer: Dictionary["footer"] }) {
  return (
    <footer className="foot">
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
    </footer>
  );
}
