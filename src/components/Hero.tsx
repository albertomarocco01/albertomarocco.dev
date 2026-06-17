// Static, server-rendered hero — zero 3D, the LCP-critical layer.
export function Hero() {
  return (
    <header className="hero">
      <p className="eyebrow">
        full-stack developer &amp; creative technologist based in Turin
      </p>
      <h1 className="name">
        Alberto
        <br />
        Marocco<em>.</em>
      </h1>
      <p className="lede">
        I build high-performance web interfaces and generative visuals — where
        robust code meets real-time graphics, for screens and LED walls alike.
      </p>
    </header>
  );
}
