"use client";

import { useRef, useState } from "react";
import { gestureAxis, swipeOffset, swipeOutcome } from "@/lib/domain/swipe";

// How long the row takes to slide off before the set is deleted. Matches duration-150 below.
const LEAVE_MS = 150;
// A pause this long before lifting cancels a flick.
const STILL_MS = 100;

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
  axis: "x" | "y" | null;
  lastX: number;
  lastT: number;
  // px per ms, negative leftward, from the last two moves.
  velocity: number;
};

// One list row you can swipe left to delete. The row follows the finger over a red Delete panel;
// let go past halfway (or flick) and it slides off and `onDelete` runs, otherwise it springs back.
// The decisions are `lib/domain/swipe.ts`; this measures and moves.
//
// `touch-action: pan-y` leaves vertical scrolling to the browser, which cancels the pointer when it
// takes over, and a gesture that starts vertical is abandoned for good — so scrolling the history
// never deletes anything. The only state is where the row sits right now; nothing is stored.
export function SwipeToDelete({
  onDelete,
  className,
  children,
}: {
  onDelete: () => Promise<void>;
  className: string;
  children: React.ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const [phase, setPhase] = useState<"idle" | "dragging" | "settling" | "leaving">("idle");
  const gesture = useRef<Gesture | null>(null);

  function down(event: React.PointerEvent<HTMLDivElement>) {
    if (phase === "leaving" || gesture.current !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: event.currentTarget.getBoundingClientRect().width,
      axis: null,
      lastX: event.clientX,
      lastT: event.timeStamp,
      velocity: 0,
    };
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (g === null || g.pointerId !== event.pointerId) return;
    const dx = event.clientX - g.startX;

    if (g.axis === null) {
      g.axis = gestureAxis(dx, event.clientY - g.startY);
      if (g.axis === null) return;
      if (g.axis === "y") {
        gesture.current = null; // a scroll: the page has it
        return;
      }
      setPhase("dragging");
      // Keeps the moves coming when the finger leaves the row. A synthetic pointer has nothing to
      // capture and can throw; the swipe still works while the finger stays on the row.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* nothing to capture */
      }
    }

    const elapsed = event.timeStamp - g.lastT;
    if (elapsed > 0) g.velocity = (event.clientX - g.lastX) / elapsed;
    g.lastX = event.clientX;
    g.lastT = event.timeStamp;
    setOffset(swipeOffset(dx, g.width));
  }

  function up(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (g === null || g.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (g.axis !== "x") return;

    // A finger that stopped before lifting isn't flicking, whatever its last move was.
    const velocity = event.timeStamp - g.lastT > STILL_MS ? 0 : g.velocity;
    if (swipeOutcome(event.clientX - g.startX, g.width, velocity) === "reset") {
      reset();
      return;
    }
    setPhase("leaving");
    setOffset(-g.width);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => void remove(), reduced ? 0 : LEAVE_MS);
  }

  async function remove() {
    try {
      await onDelete();
    } catch {
      reset(); // nothing was deleted, so show the row again
    }
  }

  function reset() {
    gesture.current = null;
    setPhase("settling");
    setOffset(0);
  }

  return (
    <li className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 flex items-center justify-end bg-negative px-6">
        <span className="font-semibold text-ink">Delete</span>
      </div>
      <div
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          if (gesture.current !== null) reset();
        }}
        onTransitionEnd={() => {
          if (phase === "settling") setPhase("idle");
        }}
        className={`relative select-none bg-card ${
          phase === "settling" || phase === "leaving"
            ? "motion-safe:transition-transform motion-safe:duration-150"
            : ""
        } ${className}`}
      >
        {children}
      </div>
    </li>
  );
}
