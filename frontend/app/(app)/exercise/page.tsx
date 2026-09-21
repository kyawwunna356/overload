import { Suspense } from "react";
import { LogSheet } from "@/components/LogSheet";

// The Suspense boundary is required: LogSheet reads the URL's query string in the browser,
// so this page can still be prerendered (and prefetched) as a static page.
export default function ExercisePage() {
  return (
    <Suspense fallback={null}>
      <LogSheet />
    </Suspense>
  );
}
