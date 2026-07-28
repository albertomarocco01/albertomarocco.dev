"use client"; // Error boundaries must be Client Components

/**
 * Route-level fallback for the main site. Without it, anything that throws
 * during render — a failed dynamic chunk after a redeploy, a WebGL context the
 * browser refuses to hand out — takes the whole document down to a blank page.
 * The site chrome in (site)/layout.tsx stays mounted around this.
 */
export default function SiteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="wrap" style={{ paddingBlock: "28vh 12vh" }}>
      <span className="sect-label">
        <span>error</span>
      </span>
      <h1 className="gd-title">Something broke on the way here.</h1>
      <p className="gd-lede">
        The page failed to render. Trying again usually fixes it — the cause is
        most often a stale script from a previous version of the site.
      </p>
      <p className="gd-lede">
        <button type="button" className="gd-back" onClick={() => unstable_retry()}>
          ↻ try again
        </button>
      </p>
      {error.digest && (
        <p className="loader-meta" style={{ marginTop: "2rem" }}>
          <span className="loader-tag">ref</span>
          <span className="loader-count">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
