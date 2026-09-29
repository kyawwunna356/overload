import type { PR } from "@/lib/domain/prs";
import type { SetLog } from "@/lib/domain/types";
import { recordParts } from "@/lib/format";

// A record on one line: what it beat in quiet grey, an arrow, and the new value in yellow, the same
// size ("82.5 → 85 kg × 5", or "105 kg × 5 → 6 reps" for a reps record). It's short enough for one line on a phone; if it ever isn't, it breaks
// between the two values, never inside one, and it's never cut off. The kind of record ("Heaviest") isn't
// shown, only read to screen readers: "Heaviest: was 100 kg, now 102.5 kg × 5". Used by the rewards
// list and the record pop-up, so a record looks the same wherever it shows.
export function RecordChange({ set, prs }: { set: Pick<SetLog, "weight" | "reps">; prs: readonly PR[] }) {
  const { label, from, to } = recordParts(set, prs);
  return (
    <span className="flex flex-wrap items-baseline text-sm tabular-nums">
      <span className="sr-only">{label}: </span>
      {from !== "" && (
        <>
          <span className="whitespace-nowrap text-body">
            <span className="sr-only">was </span>
            {from}
            <span aria-hidden className="px-1.5">
              →
            </span>
          </span>
        </>
      )}
      <span className="font-semibold whitespace-nowrap text-record">
        <span className="sr-only">now </span>
        {to}
      </span>
    </span>
  );
}
