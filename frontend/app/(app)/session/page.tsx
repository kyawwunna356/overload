import { Suspense } from "react";
import { SessionSummary } from "@/components/SessionSummary";

// The Suspense boundary is required: SessionSummary reads the URL's query string in the
// browser, so this page can still be prerendered (and prefetched) as a static page.
export default function SessionPage() {
  return (
    <Suspense fallback={null}>
      <SessionSummary />
    </Suspense>
  );
}
