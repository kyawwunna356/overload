import type { Recap } from "@/lib/domain/recap";
import type { SessionSummary } from "@/lib/domain/sessions";
import { RecordChange } from "./RecordChange";

// What the session earned, one row each: every record (a trophy, then what it beat and the new
// value — see RecordChange) and every level reached (a star, "Reached Level 5"), in the order they
// happened. Yellow, the colour records
// and levels share across the app. Nothing compares you with another day beyond the value a record
// beat. The caller leaves it out when there's nothing to list.
export function RewardList({ recap, summary }: { recap: Recap; summary: SessionSummary }) {
  const nameOf = exerciseNames(summary);
  return (
    <ul className="flex flex-col gap-5 rounded-card bg-card px-5 py-5">
      {recap.prs.map((entry) => (
        <Reward
          key={entry.set.id}
          icon={<TrophyIcon />}
          tint="bg-record-pale text-record"
          name={nameOf(entry.set.exercise_id)}
        >
          <RecordChange set={entry.set} prs={entry.prs} />
        </Reward>
      ))}
      {recap.levelUps.map((up) => (
        <Reward
          key={up.exerciseId}
          icon={<StarIcon />}
          tint="bg-level-pale text-level"
          name={nameOf(up.exerciseId)}
        >
          <span className="block text-sm font-semibold text-level">Reached Level {up.level}</span>
        </Reward>
      ))}
    </ul>
  );
}

export function hasRewards(recap: Recap): boolean {
  return recap.prs.length > 0 || recap.levelUps.length > 0;
}

function Reward({
  icon,
  tint,
  name,
  children,
}: {
  icon: React.ReactNode;
  tint: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <span aria-hidden className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill ${tint}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block pb-0.5 font-semibold text-ink">{name}</span>
        {children}
      </span>
    </li>
  );
}

// Exercise names for a session's ids; an exercise missing from this device reads as unknown.
export function exerciseNames(summary: SessionSummary): (id: string) => string {
  const names = new Map<string, string>();
  for (const group of summary.groups) {
    if (group.exercise) names.set(group.exercise.id, group.exercise.name);
  }
  return (id) => names.get(id) ?? "Unknown exercise";
}

export function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6L12 4Z" />
    </svg>
  );
}
