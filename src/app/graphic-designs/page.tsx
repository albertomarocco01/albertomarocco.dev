import type { Metadata } from "next";

// ponytail: mock gallery. Real designs land here later (pulled from the other
// chat) — for now, placeholder plates so the route + reveal flow are wired up.
export const metadata: Metadata = {
  title: "Merge — Graphic Designs",
};

const PLACEHOLDERS = Array.from({ length: 6 }, (_, i) => i + 1);

export default function GraphicDesigns() {
  return (
    <main className="gd">
      <a href="/" className="gd-back">
        ← back
      </a>
      <header className="gd-head">
        <span className="sect-label">
          <span>graphic design</span>
        </span>
        <h1 className="gd-title">Merge — Graphic Designs</h1>
        <p className="gd-lede">
          A merged set of selected graphic work — identities, posters, type.
          Coming soon.
        </p>
      </header>
      <div className="gd-grid">
        {PLACEHOLDERS.map((n) => (
          <div className="gd-plate" key={n} aria-hidden="true">
            <span className="gd-plate-idx">
              {String(n).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
