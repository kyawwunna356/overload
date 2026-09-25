import { Suspense } from "react";
import { AccountForm } from "@/components/AccountForm";

// Sign in to back up. A static page like the others, so it opens with no signal; the form says
// so if you try to sign in offline. The Suspense boundary lets AccountForm read `?code` (the
// Google return) in the browser while the page itself is prerendered.
export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountForm />
    </Suspense>
  );
}
