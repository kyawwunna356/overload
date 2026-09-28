"use client";

import { useSearchParams } from "next/navigation";
import { closeSheet } from "@/lib/sheets";
import { LogSheetBody } from "./LogSheet";
import { Sheet } from "./Sheet";

// Opens whichever sheet the URL names, over whatever page is showing. Mounted once in the app
// layout, so any screen can open a sheet with openSheet() and nothing about the page underneath
// changes. With no sheet param it renders nothing.
export function SheetHost() {
  const log = useSearchParams().get("log");
  if (log === null) return null;

  return (
    // The content is keyed by exercise, so Next up swaps in a clean log sheet without closing
    // and reopening the sheet itself; `scrollKey` brings the new one in from the top.
    <Sheet label="Log a set" onClose={closeSheet} scrollKey={log}>
      <div key={log} className="pb-6">
        <LogSheetBody exerciseId={log} />
      </div>
    </Sheet>
  );
}
