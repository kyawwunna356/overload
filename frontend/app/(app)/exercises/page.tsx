import { Suspense } from "react";
import { ExercisePicker } from "@/components/ExercisePicker";

// The Suspense boundary is required: ExercisePicker reads the URL's query string in the
// browser, so this page can still be prerendered (and prefetched) as a static page.
export default function ExercisesPage() {
  return (
    <Suspense fallback={null}>
      <ExercisePicker />
    </Suspense>
  );
}
