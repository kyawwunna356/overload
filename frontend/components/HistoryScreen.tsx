"use client";

import { useSearchParams } from "next/navigation";
import { HistoryExercises } from "./HistoryExercises";
import { HistorySessions } from "./HistorySessions";

type View = "sessions" | "exercises";

// The History tab: a Sessions | Exercises switch, then that view. Sessions answers "what did I do
// on Thursday", Exercises "what did I bench five weeks ago". The choice lives in `?view=`, replaced
// rather than pushed, so back from a lift's page or a summary returns to the same view.
export function HistoryScreen() {
  const view: View = useSearchParams().get("view") === "exercises" ? "exercises" : "sessions";
  const choose = (next: View) =>
    window.history.replaceState(null, "", next === "sessions" ? "/history" : "/history?view=exercises");

  return (
    <>
      <div role="tablist" aria-label="History" className="mb-6 grid grid-cols-2 gap-1 rounded-[1rem] bg-card p-1">
        {(["sessions", "exercises"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => choose(option)}
            // Softly rounded, the selected half a step lighter with white text (the user's design).
            className={`h-10 touch-manipulation rounded-control text-base font-semibold ${
              view === option ? "bg-raised text-ink" : "text-body active:text-ink"
            }`}
          >
            {option === "sessions" ? "Sessions" : "Exercises"}
          </button>
        ))}
      </div>
      {view === "sessions" ? <HistorySessions /> : <HistoryExercises />}
    </>
  );
}
