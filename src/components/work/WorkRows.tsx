"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { WORK, type Work } from "@/lib/work";
import type { WorkText } from "@/lib/i18n";
import { TIMING } from "@/lib/motion";
import { useApp } from "@/components/providers/AppProvider";
import { Row } from "./Row";

/**
 * The signature interaction. One row open at a time; hover-intent (open delay,
 * close grace) avoids flicker on quick sweeps; focus opens instantly; siblings
 * dim via CSS. Touch taps toggle gen rows and follow links on web rows.
 *
 * `items` is the active dictionary's per-work copy, keyed by `work.id`; each
 * Row reads its own description/cue from it.
 */
export function WorkRows({ items }: { items: Record<string, WorkText> }) {
  const { reducedMotion, fieldReady } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);

  const touch = useRef(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    touch.current = window.matchMedia("(hover: none)").matches;
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const intentOpen = useCallback(
    (id: string) => {
      clearTimers();
      openTimer.current = window.setTimeout(
        () => setOpenId(id),
        TIMING.intentOpen,
      );
    },
    [clearTimers],
  );

  const intentClose = useCallback(
    (id: string) => {
      clearTimers();
      closeTimer.current = window.setTimeout(
        () => setOpenId((cur) => (cur === id ? null : cur)),
        TIMING.intentClose,
      );
    },
    [clearTimers],
  );

  const openNow = useCallback(
    (id: string) => {
      clearTimers();
      setOpenId(id);
    },
    [clearTimers],
  );

  const handleClick = useCallback((work: Work, e: MouseEvent) => {
    // Desktop: hover/focus already drive the reveal. Touch: tap toggles gen
    // rows (no navigation); web rows fall through to their link.
    if (touch.current && work.type === "gen") {
      e.preventDefault();
      setOpenId((cur) => (cur === work.id ? null : work.id));
    }
  }, []);

  return (
    <div className={`rows${openId ? " has-open" : ""}`}>
      {WORK.map((work) => (
        <Row
          key={work.id}
          work={work}
          text={items[work.id]}
          isOpen={openId === work.id}
          reducedMotion={reducedMotion}
          fieldReady={fieldReady}
          onEnter={() => {
            if (!touch.current) intentOpen(work.id);
          }}
          onLeave={() => {
            if (!touch.current) intentClose(work.id);
          }}
          onFocus={() => openNow(work.id)}
          onBlur={() => intentClose(work.id)}
          onClick={(e) => handleClick(work, e)}
        />
      ))}
    </div>
  );
}
