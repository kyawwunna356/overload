import { Suspense } from "react";
import { AppFrame } from "@/components/AppFrame";
import { SheetHost } from "@/components/SheetHost";
import { SyncAgent } from "@/components/SyncAgent";
import { TabBar } from "@/components/TabBar";

// Phone-width shell shared by the app's screens. AppFrame fills the screen: the page scrolls inside
// it and the TabBar is its bottom row, so the bar never floats over a viewport iOS re-measures
// (it used to jump between tabs in the installed app). The safe-area insets keep content clear of
// the notch; the tab bar pads for the home bar, and pages without it pad for it themselves.
// TabBar shows on the three tab pages only. SheetHost opens the sheet the URL names (?log=…) over
// any page; its Suspense boundary lets it read the query in the browser while every page stays
// prerendered. SyncAgent runs the background backup on every screen; it renders nothing.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppFrame
        page={
          <main className="mx-auto w-full max-w-md px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
        }
        bottom={<TabBar />}
      />
      <Suspense fallback={null}>
        <SheetHost />
      </Suspense>
      <SyncAgent />
    </>
  );
}
