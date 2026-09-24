"use client";

import { useEffect, useRef } from "react";

// How the burst behaves, in CSS pixels and seconds.
const PIECES_PER_CANNON = 60;
const GRAVITY = 1400;
const DRAG = 1.1; // share of velocity lost per second
const MAX_SECONDS = 3;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  angle: number;
  spin: number;
  // Phase of the flip: the piece's width shrinks and grows as it tumbles.
  flip: number;
  flipSpeed: number;
  color: string;
};

// A confetti burst for the finish moment: two cannons at the bottom corners fire once, up and
// inward, and the pieces tumble down off the screen. Hand-rolled on a canvas, no dependency. It
// never takes a tap (pointer-events: none), and draws nothing when reduced motion is asked for.
//
// Colours are the theme's own tokens, read from CSS variables, so no raw colour lives here.
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);

    const style = getComputedStyle(document.documentElement);
    const colors = ["--color-primary", "--color-record", "--color-ink"]
      .map((name) => style.getPropertyValue(name).trim())
      .filter((color) => color !== "");
    if (colors.length === 0) return;

    const pieces: Piece[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < PIECES_PER_CANNON; i++) {
        // Up and inward: about 65° from the ground, give or take 15°.
        const tilt = ((65 + (Math.random() - 0.5) * 30) * Math.PI) / 180;
        const speed = 1100 + Math.random() * 900;
        pieces.push({
          x: side === -1 ? 0 : width,
          y: height,
          vx: -side * Math.cos(tilt) * speed,
          vy: -Math.sin(tilt) * speed,
          width: 6 + Math.random() * 5,
          height: 10 + Math.random() * 8,
          angle: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 12,
          flip: Math.random() * Math.PI,
          flipSpeed: 6 + Math.random() * 8,
          color: colors[i % colors.length],
        });
      }
    }

    let frame = 0;
    let last: number | null = null;
    let elapsed = 0;
    const draw = (time: number) => {
      // Seconds since the last frame, capped so a stalled tab doesn't fling pieces off-screen.
      const dt = last === null ? 0 : Math.min(0.05, (time - last) / 1000);
      last = time;
      elapsed += dt;

      context.clearRect(0, 0, width, height);
      let visible = 0;
      for (const piece of pieces) {
        const damping = Math.max(0, 1 - DRAG * dt);
        piece.vx *= damping;
        piece.vy = piece.vy * damping + GRAVITY * dt;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.angle += piece.spin * dt;
        piece.flip += piece.flipSpeed * dt;
        if (piece.y > height + 40) continue;

        visible += 1;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        context.scale(Math.cos(piece.flip), 1);
        context.fillStyle = piece.color;
        context.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        context.restore();
      }

      if (visible > 0 && elapsed < MAX_SECONDS) {
        frame = requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
