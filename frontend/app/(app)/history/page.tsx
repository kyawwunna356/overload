import { Suspense } from "react";
import { HistoryScreen } from "@/components/HistoryScreen";

// The History tab: your sessions by week, or every lift you've logged. The Suspense boundary is
// required: the screen reads `?view=` and `?weeks=` in the browser, so the page can still be
// prerendered as a static page that opens offline.
export default function HistoryPage() {
  return (
    <>
      <header className="px-2 pb-6">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          History
        </h1>
      </header>
      <Suspense fallback={null}>
        <HistoryScreen />
      </Suspense>
    </>
  );
}
