import { Suspense } from "react";
import { SheetHost } from "@/components/SheetHost";
import { SyncAgent } from "@/components/SyncAgent";
import { TabBar } from "@/components/TabBar";

// Phone-width shell shared by the app's screens. The safe-area insets keep content clear
// of the notch and home bar (the viewport is set to fill the whole screen in the root layout).
// TabBar shows on the three tab pages only. SheetHost opens the sheet the URL names (?log=…)
// over any page; its Suspense boundary lets it read the query in the browser while every page
// stays prerendered. SyncAgent runs the background backup on every screen; it renders nothing.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {children}
      <TabBar />
      <Suspense fallback={null}>
        <SheetHost />
      </Suspense>
      <SyncAgent />
    </main>
  );
}
