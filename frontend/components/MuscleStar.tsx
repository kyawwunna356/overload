import type { Muscle, MuscleBalance } from "@/lib/domain/muscles";
import { muscleLabel } from "@/lib/format";

// Clockwise from the top: the upper body across the top half, legs and core underneath.
const AXES: readonly Muscle[] = ["chest", "shoulders", "arms", "core", "legs", "back"];

const WIDTH = 360;
const HEIGHT = 310;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const R = 90; // the rim: where the busiest group reaches
// Labels sit just past the rim, a little further out at the sides where they're widest.
const LABEL_R = { vertical: R + 30, side: R + 40 };
const MIN_R = R * 0.12; // a group with one set still shows as a point off the centre

// The session's muscle balance as a six-point star: each axis reaches out in proportion to that
// group's working sets, scaled so the busiest group touches the rim. Hand-drawn SVG, no chart
// library. It shows one session only — the one exception to the no-charts rule — and nothing on it
// compares with another day.
export function MuscleStar({ balance }: { balance: MuscleBalance }) {
  const max = Math.max(1, ...AXES.map((muscle) => balance[muscle]));
  const at = (index: number, radius: number) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
  };
  const ring = (fraction: number) =>
    AXES.map((_, i) => {
      const p = at(i, R * fraction);
      return `${p.x},${p.y}`;
    }).join(" ");
  const points = AXES.map((muscle, i) => {
    const count = balance[muscle];
    return at(i, count === 0 ? 0 : Math.max(MIN_R, (count / max) * R));
  });

  const label = AXES.map((muscle) => `${muscleLabel(muscle)} ${balance[muscle]}`).join(", ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Working sets by muscle group: ${label}`}
      className="block w-full"
    >
      {[1 / 3, 2 / 3, 1].map((fraction) => (
        <polygon key={fraction} points={ring(fraction)} className="fill-none stroke-line" strokeWidth={1.5} />
      ))}
      {AXES.map((muscle, i) => {
        const end = at(i, R);
        return <line key={muscle} x1={CX} y1={CY} x2={end.x} y2={end.y} className="stroke-line" strokeWidth={1.5} />;
      })}

      <g
        style={{ transformBox: "view-box", transformOrigin: "center" }}
        className="motion-safe:animate-star-in"
      >
        <polygon
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          className="fill-primary/25 stroke-primary"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {AXES.map((muscle, i) =>
          balance[muscle] > 0 ? (
            <circle key={muscle} cx={points[i].x} cy={points[i].y} r={4} className="fill-primary" />
          ) : null,
        )}
      </g>

      {AXES.map((muscle, i) => {
        const p = at(i, i % 3 === 0 ? LABEL_R.vertical : LABEL_R.side);
        const count = balance[muscle];
        // The name over its count, centred on the point.
        return (
          <text key={muscle} x={p.x} y={p.y} textAnchor="middle">
            <tspan
              x={p.x}
              dy={-4}
              className={`text-[15px] font-semibold ${count === 0 ? "fill-mute" : "fill-ink"}`}
            >
              {muscleLabel(muscle)}
            </tspan>
            <tspan
              x={p.x}
              dy={18}
              className={`text-[15px] font-black tabular-nums ${count === 0 ? "fill-mute" : "fill-primary"}`}
            >
              {count}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
