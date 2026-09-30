"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { PAGE_SCROLLER_ID } from "@/lib/page";

// The app's frame: the full height of the screen, the page scrolling inside it and whatever sits
// under it (the tab bar) as the frame's own bottom row. The window itself never scrolls, so on an
// iPhone home-screen app nothing is pinned to a viewport that iOS re-measures between pages — the
// tab bar used to jump up and down on every tab switch.
//
// A new page starts at its top; a sheet or a query change on the same page (`?log=`, `?weeks=`)
// keeps your place.
export function AppFrame({ page, bottom }: { page: ReactNode; bottom: ReactNode }) {
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col">
      <div ref={scroller} id={PAGE_SCROLLER_ID} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {page}
      </div>
      {bottom}
    </div>
  );
}
