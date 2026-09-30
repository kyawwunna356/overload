import { Suspense } from "react";
import { HistorySessions } from "@/components/HistorySessions";

// The History tab: your sessions, grouped by week. Ticket 55 adds the exercises view beside it.
// The Suspense boundary is required: the list reads `?weeks=` in the browser, so the page can
// still be prerendered as a static page that opens offline.
export default function HistoryPage() {
  return (
    <>
      <header className="px-2 pb-6">
        <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
          History
        </h1>
      </header>
      <Suspense fallback={null}>
        <HistorySessions />
      </Suspense>
    </>
  );
}
