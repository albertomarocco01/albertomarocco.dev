"use client"; // Error boundaries must be Client Components

import { getDictionary } from "@/lib/dictionary";
import { useLocale } from "@/lib/use-locale";

/**
 * Route-level fallback for the main site. Without it, anything that throws
 * during render — a failed dynamic chunk after a redeploy, a WebGL context the
 * browser refuses to hand out — takes the whole document down to a blank page.
 * The site chrome in (site)/layout.tsx stays mounted around this.
 *
 * Next passes an error boundary no props, so the locale can't come down from the
 * server here: it's read off `<html lang>` (see useLocale) and the copy from the
 * same dictionary every other component uses — imported from ./dictionary, not
 * ./i18n, since that one pulls in `next/headers`.
 */
export default function SiteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const copy = getDictionary(useLocale()).error;
  return (
    <main className="wrap" style={{ paddingBlock: "28vh 12vh" }}>
      <span className="sect-label">
        <span>{copy.label}</span>
      </span>
      <h1 className="gd-title">{copy.title}</h1>
      <p className="gd-lede">{copy.body}</p>
      <p className="gd-lede">
        <button type="button" className="gd-back" onClick={() => unstable_retry()}>
          {copy.retry}
        </button>
      </p>
      {error.digest && (
        <p className="loader-meta" style={{ marginTop: "2rem" }}>
          <span className="loader-tag">{copy.ref}</span>
          <span className="loader-count">{error.digest}</span>
        </p>
      )}
    </main>
  );
}
