// Minimal mono footer: P.IVA · Instagram · email · domain. No physical address.
export function Footer() {
  return (
    <footer className="foot">
      <span className="vat">P.IVA — placeholder</span>
      <a
        href="https://www.instagram.com/alberto.marocco/"
        target="_blank"
        rel="noopener noreferrer"
      >
        instagram ↗
      </a>
      <a href="mailto:albertomarocco.dev@gmail.com">
        albertomarocco.dev@gmail.com
      </a>
      <span className="spacer" />
      <span className="vat">albertomarocco.dev</span>
    </footer>
  );
}
