"use client";

import { useSearchParams } from "next/navigation";
import { closeSheet } from "@/lib/sheets";
import { LiveSession } from "./LiveSession";
import { LogSheetBody } from "./LogSheet";
import { Sheet } from "./Sheet";

// Opens whichever sheet the URL names, over whatever page is showing: `?log=<id>` for an
// exercise's log sheet, `?live` for the session you're in. Mounted once in the app layout, so any
// screen can open a sheet with openSheet() and nothing about the page underneath changes. With no
// sheet param it renders nothing. One Sheet serves both, so swapping from the live screen to a log
// sheet happens inside the open sheet rather than closing and reopening it. The log sheet fills the
// screen (its entry is pinned above Log, so it needs the room); the live screen stays a slider.
export function SheetHost() {
  const params = useSearchParams();
  const log = params.get("log");
  const live = params.has("live");
  if (log === null && !live) return null;

  const key = log ?? "live";
  return (
    // The content is keyed, so a swap brings in a clean view; `scrollKey` starts it at the top.
    <Sheet label={log !== null ? "Log a set" : "Live session"} onClose={closeSheet} scrollKey={key} full={log !== null}>
      <div key={key} className="pb-6">
        {log !== null ? <LogSheetBody exerciseId={log} /> : <LiveSession />}
      </div>
    </Sheet>
  );
}
