"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { dismissOffset, dismissOutcome, gestureAxis } from "@/lib/domain/swipe";

// A bottom sheet over the page you were on: the page dims behind it and stays exactly where it
// was, scroll position included. It closes on a swipe down from the grab strip, a tap on the
// dimmed strip above it, Escape, or the browser's back (the caller owns the URL; see
// lib/sheets.ts). The content scrolls inside the sheet; the footer slot below it doesn't, so a
// primary button placed there stays in the thumb zone and rides with the sheet when it's dragged.

// Where content may portal its pinned buttons. Null outside a sheet, so the same component can
// fall back to pinning itself to the screen on a full page.
const SheetFooter = createContext<HTMLElement | null>(null);

export function useSheetFooter(): HTMLElement | null {
  return useContext(SheetFooter);
}

const CLOSE_MS = 200;

export function Sheet({
  label,
  onClose,
  scrollKey,
  children,
}: {
  label: string;
  onClose: () => void;
  // When this changes the content is new, so it scrolls back to the top.
  scrollKey?: string;
  children: ReactNode;
}) {
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [scrollKey]);
  // How far the sheet sits below its open position, and whether it's following a finger (no
  // transition) or settling (animated back up, or out).
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const drag = useRef<{ id: number; y: number; x: number; at: number; axis: "x" | "y" | null } | null>(
    null,
  );
  const closing = useRef(false);

  // Keep the page underneath from scrolling while the sheet is up, and close on Escape.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function slideOut() {
    if (closing.current) return;
    closing.current = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !panel.current) {
      onClose();
      return;
    }
    setSettling(true);
    setOffset(panel.current.offsetHeight);
    window.setTimeout(onClose, CLOSE_MS);
  }

  return createPortal(
    <div className="fixed inset-0 z-30">
      <div
        aria-hidden
        onClick={slideOut}
        className="absolute inset-0 bg-page/70 motion-safe:animate-scrim-in"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{
          transform: offset > 0 ? `translateY(${offset}px)` : undefined,
          transition: settling ? `transform ${CLOSE_MS}ms ease-out` : undefined,
        }}
        onTransitionEnd={() => setSettling(false)}
        className="absolute inset-x-0 bottom-0 mx-auto flex h-[92dvh] max-w-md flex-col rounded-t-card bg-card shadow-[0_-8px_32px_rgb(0_0_0/0.5)] motion-safe:animate-sheet-up"
      >
        {/* The grab strip: the one place a downward drag moves the sheet, so the content below
            still scrolls normally under a finger. touch-action none keeps the browser from
            claiming the gesture as a scroll. */}
        <div
          className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center"
          onPointerDown={(event) => {
            if (closing.current) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { id: event.pointerId, y: event.clientY, x: event.clientX, at: event.timeStamp, axis: null };
            setSettling(false);
          }}
          onPointerMove={(event) => {
            const d = drag.current;
            if (!d || d.id !== event.pointerId) return;
            const dy = event.clientY - d.y;
            d.axis ??= gestureAxis(event.clientX - d.x, dy);
            if (d.axis === "y") setOffset(dismissOffset(dy));
          }}
          onPointerUp={(event) => {
            const d = drag.current;
            if (!d || d.id !== event.pointerId) return;
            drag.current = null;
            const dy = dismissOffset(event.clientY - d.y);
            const velocity = dy / Math.max(1, event.timeStamp - d.at);
            const height = panel.current?.offsetHeight ?? window.innerHeight;
            if (d.axis === "y" && dismissOutcome(dy, height, velocity) === "close") {
              slideOut();
            } else {
              setSettling(true);
              setOffset(0);
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
            setSettling(true);
            setOffset(0);
          }}
        >
          <span aria-hidden className="h-1.5 w-10 rounded-pill bg-line" />
        </div>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <SheetFooter.Provider value={footer}>{children}</SheetFooter.Provider>
        </div>
        <div ref={setFooter} className="shrink-0" />
        {/* Screen readers and keyboards get a real way out; fingers use the strip or the page. */}
        <button type="button" onClick={onClose} className="sr-only focus:not-sr-only">
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}
