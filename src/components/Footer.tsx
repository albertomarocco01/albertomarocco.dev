// Minimal mono footer: P.IVA · Instagram · email · domain. No physical address.
export function Footer() {
  return (
    <footer className="foot">
      <span className="vat">P.IVA 00000000000</span>
      <a
        href="https://instagram.com/albertomarocco"
        target="_blank"
        rel="noopener noreferrer"
      >
        instagram ↗
      </a>
      <a href="mailto:hello@albertomarocco.dev">hello@albertomarocco.dev</a>
      <span className="spacer" />
      <span className="vat">albertomarocco.dev</span>
    </footer>
  );
}
