// The immersive route group has no chrome of its own — that all lives in
// (site)/layout.tsx — but it needs one hook in the DOM: `.immersive` lets
// globals.css release the scrollbar gutter the site reserves on <html>
// (`scrollbar-gutter: stable`). Without it every demo's `position: fixed;
// inset: 0` stage is a gutter narrower than the viewport, off-centre by half of
// it, with a dead band on the right. `display: contents` keeps the wrapper out
// of the box tree, so the demos' fixed roots are laid out exactly as before.
export default function ImmersiveLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="immersive">{children}</div>;
}
