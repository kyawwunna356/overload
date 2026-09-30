import { Suspense } from "react";
import { ExerciseDetail } from "@/components/ExerciseDetail";

// One lift's page under History. The Suspense boundary is required: it reads `?id=` in the
// browser, so the page can still be prerendered as a static page that opens offline.
export default function HistoryExercisePage() {
  return (
    <Suspense fallback={null}>
      <ExerciseDetail />
    </Suspense>
  );
}
