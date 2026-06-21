import type { Dictionary } from "@/lib/i18n";

// Short, deep. The thesis: this site runs his own generative work, live.
// Copy comes in as a prop so the component stays server-rendered.
export function About({ about }: { about: Dictionary["about"] }) {
  return (
    <section id="about" className="about">
      <span className="a-label">{about.label}</span>
      {about.body}
    </section>
  );
}
