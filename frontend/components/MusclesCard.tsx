import type { MuscleBalance } from "@/lib/domain/muscles";
import { MuscleStar } from "./MuscleStar";

// The session's shape: the muscle star on its own, under a "Muscles" heading. One session only —
// the one chart the app allows — and nothing compares it with another day. The caller leaves it out
// when no working set counted.
export function MusclesCard({ balance }: { balance: MuscleBalance }) {
  return (
    <section aria-labelledby="muscles-heading" className="flex flex-col gap-3 pt-3">
      <h2 id="muscles-heading" className="px-2 text-xl font-semibold tracking-tight text-ink">
        Muscles
      </h2>
      <div className="rounded-card bg-card px-2 py-4">
        <div className="mx-auto max-w-[17rem]">
          <MuscleStar balance={balance} />
        </div>
      </div>
    </section>
  );
}
