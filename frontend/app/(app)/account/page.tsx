import { Suspense } from "react";
import { MeScreen } from "@/components/MeScreen";

// The Me tab: backup, sign-in, install and version. A static page like the others, so it opens
// with no signal; sign-in says so when there's none. The Suspense boundary lets MeScreen read
// `?code` (the Google return) in the browser while the page itself is prerendered.
export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <MeScreen />
    </Suspense>
  );
}
