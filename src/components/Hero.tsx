import type { Dictionary } from "@/lib/i18n";

// Static, server-rendered hero — zero 3D, the LCP-critical layer. Copy comes in
// as a prop so the component stays a server component (no client JS).
export function Hero({ hero }: { hero: Dictionary["hero"] }) {
  return (
    <header className="hero">
      <p className="eyebrow">{hero.eyebrow}</p>
      <h1 className="name">
        Alberto
        <br />
        Marocco<em>.</em>
      </h1>
      <p className="lede">{hero.lede}</p>
    </header>
  );
}
