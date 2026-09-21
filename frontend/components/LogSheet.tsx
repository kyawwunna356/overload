"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { patternLabel } from "@/lib/format";
import { useLogSheet } from "@/lib/hooks/useLogSheet";
import { useNow } from "@/lib/hooks/useNow";
import { SetEntry } from "./SetEntry";
import { SetHistory } from "./SetHistory";

// The log sheet for one exercise, chosen by `?id=` in the URL. It's a static page that reads
// the id in the browser, so opening it from the board never waits on a server — it works
// with no signal. Everything shown comes from the local database.
export function LogSheet() {
  const id = useSearchParams().get("id");
  const data = useLogSheet(id);
  const now = useNow();
  const router = useRouter();

  return (
    // Bottom padding keeps the last content clear of the pinned Log button.
    <div className="pb-56">
      <nav className="pb-4">
        <Link
          href="/"
          onClick={(event) => {
            // Coming from the board, going back reuses its cached page. A plain link to "/"
            // would ask the server for it, which fails with no signal. With no history to
            // go back to, the link's normal navigation applies.
            if (window.history.length > 1) {
              event.preventDefault();
              router.back();
            }
          }}
          className="inline-flex h-12 touch-manipulation items-center rounded-pill bg-card px-5 text-base font-semibold text-ink active:bg-line"
        >
          ‹ Board
        </Link>
      </nav>

      {data === undefined ? null : data.exercise === null ? (
        <p className="rounded-card bg-card px-6 py-5 text-body">
          That exercise isn&apos;t on this device.
        </p>
      ) : (
        <div key={data.exercise.id} className="flex flex-col gap-6">
          <header className="px-2">
            <h1 className="font-display text-4xl font-black leading-none tracking-tight text-ink">
              {data.exercise.name}
            </h1>
            <p className="pt-2 text-body">{patternLabel(data.exercise.pattern)}</p>
          </header>
          <SetEntry exerciseId={data.exercise.id} previous={data.previous} now={now} />
          <SetHistory history={data.history} now={now} />
        </div>
      )}
    </div>
  );
}
