# Progress

What has been built in this app and what's next, so a new session can pick up without
re-reading the whole repo. **Read this file at the start of every session**, then
`CLAUDE.md` (rules and current milestone) and `.claude/skills/plan-ticket/tickets.md`
(ticket statuses). It is updated in the same commit as each piece of work — see
[How this file is kept](#how-this-file-is-kept).

## Where we are

- **Milestone 6 — Sync and install is finished** (Tickets 35–39). The user ran the check on the
  iPhone on 2026-09-28 (Ticket 39), and everything passed: the app installed from
  https://overload-three-zeta.vercel.app, restored the history through Google sign-in, and logged
  offline.
- **The redesign** follows the user's UX flow plan and Figma file (*Overload — UI/UX redesign*),
  split into four milestones, 7–10 (Tickets 40–58 in `tickets.md`), each ending in an iPhone check.
- **Milestone 7 — Shell and live session is finished** (Tickets 40–44). The user confirmed the
  check on the iPhone on 2026-09-29 (Ticket 44).
- **Milestone 8 — Log sheet as a set table is finished** (Tickets 45–49). The user confirmed the
  iPhone check (Ticket 49) on 2026-09-30, with no fixes needed. CLAUDE.md's current milestone is 9.
- **The redesign is built on the `redesign` branch** (the user's choice), pushed to GitHub but not
  merged: `main` and the installed app stay on 1.0.0 until the redesign is ready.
- **Last commit (on `redesign`):** `bugfix: Show the record banner as a toast at the top`.
  Before it: `bugfix: Darken the log sheet — page behind, card blocks`, then `feature: Rebuild the session summary and finish deck to the
  mock-ups` (Ticket 52, plus the board's PR pill), then `feature: Make edit board a page with
  scrolling chips and custom exercises` (Tickets 51 and 57), `bugfix: Quieten board rows — tick badges,
  shorter lines, no level`, `feature: Show today and last time on board rows, with the week and
  pattern ticks` (Ticket 50), `docs: Close milestone 8 after the iPhone check` (Ticket 49,
  which has no code commit), then Tickets 46, 43, and 41/42/45/47/48 in one commit. Ticket 40's
  docs commit is on `main`.
- **Next: Ticket 53** (the milestone 9 check on the iPhone). Ticket 57 (custom exercises) is already done,
  pulled forward into Ticket 51.
- **The phone sees `redesign` only after a push**, through Vercel's preview for the branch. The
  installed app follows `main`. With no push, Safari on the same Wi-Fi can open the Mac's preview
  at `http://<Mac's LAN IP>:3000` (plain http, so there's no service worker and no sign-in).
- **Sign-in is Google only on screen** (`SHOW_EMAIL_CODE = false` in `MeScreen.tsx`). The email
  code still works in code, and the flag brings it back.
- **Local builds:** `pnpm build` (the static export plus `out/sw.js`), then `pnpm preview` on
  port 3000. `next start` no longer works.
- **Tests:** 453 Vitest tests, domain layer only.

## What works today

- **Board** (`/`, Ticket 50):
  - **Header:** the date (`Wed 30 Sep`), and **Edit** as plain lime text on the right. Edit opens
    `/exercises`.
  - **Week strip:** this week, Monday to Sunday. Trained days are filled green, and today gets a
    green ring while a session is running.
  - **Groups:** the pattern groups you've picked for, each holding **the exercises you picked, in
    the order you put them in**. They're never re-sorted by what you did last, and logging never
    moves a row. A group with no picks is hidden. With nothing picked at all, one "Pick your
    exercises" card offers the catalogue.
  - **Heading ticks:** a round pale-green badge with a lime tick (`CheckBadge`) beside a pattern
    heading once the running session has touched it. That's all the board shows of coverage.
  - **Rows** (`rowState` in `board.ts`): the name, then one short 13 px line with no label:
    - `3 sets · 102.5 × 5` in lime, with the tick badge before the `›`, once the running session
      has a set of the lift (the second part is the heaviest set). If one of today's sets broke a
      record, a yellow **PR** pill takes the tick's place (the session recap's records, so it
      agrees with the pop-up and the summary);
    - otherwise `82.5 kg × 5 · 4d` in grey (under a day the age is left off, never "today");
    - nothing for a lift never done, so it's just its name.
    Screen readers still hear "Today:" and "Last time:".
  - The `›` on each row says it opens the log sheet.
- **Edit board** (`/exercises`, Ticket 51; a plain page, never a sheet — the user's choice):
  - **Header:** "Edit board", and **+ New** in lime on the right. There's no back button and no
    Done: every change saves as you make it, and you leave by swiping back.
  - **Search box** with a magnifier icon, then **one row of pattern chips** that scrolls sideways to
    the screen's edges: All, Squat … Core, each with how many you've picked (`All 3`, `Push 2`) and
    a ✓ on the selected one. The chip lives in `?pattern=`, replaced rather than pushed, so a
    reload keeps it and back goes straight to the board. The board's Edit opens All; a group's `+`
    opens its own chip.
  - **The list** for the chip (or every pattern under All): your picks first, in your order, each
    with a small `On board ✓` pill and a grip handle you drag to reorder (the board follows); then
    the rest of the catalogue with small `Add` pills. Tapping Add slides the row up to the end of
    your picks with a brief green glow; tapping a pick slides it back — one tap, no save button,
    and removing keeps every set you ever logged. Only a handle starts a drag, so the list still
    scrolls under a finger; the arrow keys on a focused handle reorder without a pointer. Handles
    hide while searching.
  - **+ New** (Ticket 57, pulled forward by the user) opens a small form at the top: a name and a
    pattern, preset to the chip you're on (on All, Add waits until you pick one). Add puts your lift
    in the catalogue and on your board in one transaction (`addCustomExercise`), then jumps to its
    chip. A name the catalogue already has, in any case, is never made twice: the form offers that
    lift instead ("Add it to the board"), or says it's already on your board.
- **Tab bar** (Ticket 41): Train (`/`), History (`/history`, a placeholder until milestone 10)
  and Me (`/account`), pinned at the bottom of those three pages only. A red dot on Me means
  backup is paused; "changes waiting" never badges.
- **Log sheet** (`?log=<id>` over any page, Ticket 42; `/exercise?id=…` stays as a full page for
  old links): a sheet at 92% height over the dimmed page, which never moves, so you come back to
  the same scroll spot. It closes on a swipe down from the grab strip, a tap above it, Back or
  Escape, and a reload reopens it offline. Inside, top to bottom (Figma 3.1–3.2):
  - the name, `Push · Level 3` (the dotted level still taps open `6 sessions · 4 to Level 4`), and
    the rest timer under a small `REST` label;
  - the **set table** (Ticket 45): today's sets numbered, each beside the same set last time, with
    a ✓ or a yellow `PR` pill, then a lime **Next set** row. Swipe a today row left to delete it.
  - the entry block, prefilled for set N from last time's set N, else your last set today
    (`Set 3 · prefilled from last time's set 3`). An edit carries on to the following sets. ±
    buttons (2.5 kg, ±1 rep), and tapping a number types it. Every set is `working` (see
    Decisions).
  - the Log button in the sheet's footer, and under it **Next up** (Ticket 47) once this lift has
    a set this session: the next board lift not done yet, swapped in place without a new
    history entry;
  - **Earlier · N sessions**, folded: the old history by day, swipe to delete, PR pills.
  - **Edit and undo** (Ticket 46, Figma 3.3):
    - Tap one of today's rows to edit it. It gets a lime outline, the entry block reads
      `Editing set 2` with that set's numbers, and the footer becomes **Cancel** / **Save set 2**.
    - Save changes only the weight and reps (`updateSet`). The set keeps its time and its place.
      Tapping the same row again, or Cancel, goes back to logging.
    - A swipe-delete, in the table or Earlier, shows `Set deleted · Undo` over the Log button for
      5 s. Undo (`restoreSet`) puts the same set back, with the same id and time.
    - A swipe or scroll never counts as a tap.
- **Coverage strip** (on the live screen only since Ticket 50, which moved the board's coverage
  onto the ✓ on each pattern heading): six pills, one per pattern. A pattern the session has touched is tinted with a ✓ (`Squat ✓`); the
  rest are just the name in grey. Not tappable, no counts, nothing to fail. It disappears when the
  session ends (the idle gap, or Finish).
- **Session summary** (`/session?id=…`, Ticket 52, to the user's mock-ups): it sits under the
  **History** tab (the tab bar shows with History lit). Top to bottom: a `‹ History` link, the long
  date (`Wednesday, 30 Sep`), `span · duration`, then a **stat row** of three tiles — Duration ·
  Sets · kg lifted (`sessionStats`; every set, warmups included, so it matches the deck). While the
  session runs, Duration counts up live. Once it's over: **Rewards** (a trophy per record, reading
  `100 → 102.5 kg × 5` or `105 kg × 5 → 6 reps` on one line, the new value in yellow; a star per
  level-up, "Reached Level N"), then **Muscles** (the star alone, names only, no counts), then
  **Exercises**, the session's sets grouped by exercise. Empty parts are left out. Read-only:
  tapping an exercise opens its log sheet over it, and a running session brings up the live screen.
- **The finish deck** (only right after Finish, from the one-time `finished=1` flag): a full-screen
  deck you swipe through (scroll-snap, dots), with a lime **Next** button that reads **Done** on the
  last card. Cards: **Session done** (the label, long date, span, the stat row with the kg rolling
  up, chips for records and level-ups, "Nth session this week" and the week strip with the day
  ringed), **Rewards**, **Muscles**; an empty card isn't dealt. Confetti as it opens. Done or
  Escape leaves you on the summary. Nothing about it is stored.
- **Record pop-up** (log sheet): "New record" over the same one-line record as Rewards.
- **Live session bar** (Ticket 43): from your first set until the session ends, a bar above the
  tabs on Train, History and Me: a pulsing lime dot, `Rest 1:42` big, `Session 38:10 · 12 sets`
  small. Never before a set, so there's still no Start button. A sheet covers it, so the log sheet's
  rest timer is the only big counter while you log. Tapping it opens the live screen.
- **Live screen** (`?live` over any page, Ticket 43, Figma 4.1): `SESSION · STARTED 6:04 PM`, the
  session clock as the one big number, `Rest 1:42 · 12 sets` under it, the six coverage chips, and a
  card per exercise in the order first performed (`82.5 × 5 · 85 × 5`). A card swaps the sheet to
  that exercise's log sheet in place. With no session running it says so.
- **End session** (the live screen's footer, Figma 4.2): an outlined **End session** writes nothing;
  it shows **End this session?** with a line on what finishing means, a red **Finish session** above,
  and **Resume** in exactly End's spot. Finish writes the end marker and is final: the bar goes, the
  sheet's history entry is replaced by the summary (so back returns to the page you were on), and
  the deck plays. The next set opens a new session. A session the 90-minute gap closed looks the
  same, so forgetting to end still works.
- **Timers** (only while a session is active, i.e. a set in the last 90 minutes): the live bar's
  rest and session times, the live screen's session clock, and the log sheet's `REST` timer (time
  since the last set, any exercise, counts up). All `now − timestamp`. There's no start button:
  your first set opens the session.
- **Record banner** (log sheet, Ticket 48): logging a working set that breaks a weight,
  rep-at-that-weight or e1RM record drops a yellow toast in at the top of the screen,
  `New record · 85 kg × 5 (was 82.5)`, for 3 seconds. It doesn't dim anything and catches no
  taps, so the next set can be logged straight away; nothing about it is stored. It's portaled
  to the body and fixed, so the sheet's layout never shifts when it appears.
- **PR pills** (set table, Earlier and the summary): every set that broke a record carries a small
  yellow `PR` pill, for good — beating it later doesn't take it away. Derived with `historyPRs` on
  each read, so it always agrees with the banner; a screen reader hears which records it broke.
- **Local data:**
  - The Dexie database (v5) is seeded once with the 76-exercise catalogue and an empty list.
    Only dev also gets ~6 weeks of fake training.
  - Every write is one Dexie transaction with its outbox row.
  - Every row that exists is queued in the outbox, catalogue and list included.
  - Every read passes through its table's reader (`lib/domain/rows.ts`) via Dexie's `reading`
    hook.
- **Supabase:** the five synced tables with RLS, a last-write-wins trigger and a server-set
  `synced_at` (`backend/supabase/migrations/`). The URL and publishable key live in
  `frontend/.env.local` (not committed).
- **Backup** (the Me tab, `/account`):
  - Sign in with Google or an emailed code. Google needs its dashboard setup first.
  - Once signed in, `lib/sync/push.ts` drains the outbox in the background: on open, online,
    return to the app, sign-in, and 3 s after a write.
  - Me shows one card: `Back up your log` with Continue with Google (greyed out with "No signal"
    offline), or your name and email with `Backed up`, `N changes waiting` or `Backup paused`.
    Under it, `On this phone · N sets · N sessions` (derived), an Add to Home Screen card in
    Safari only, Sign out, and the version.
  - Sign out keeps every set. The first account to back up owns the phone's data (`overload.owner`
    in localStorage).
  - **Sync runs both ways** (`syncNow` in `lib/sync/sync.ts`):
    1. the owner guard;
    2. adoption, on a fresh device's first sync only;
    3. push;
    4. pull every table since its `synced_at` cursor, with last write wins, and rows with unpushed
       changes left alone;
    5. repair any duplicated catalogue or default list, then push the repair.
- **Domain layer** (`frontend/lib/domain/`, pure and tested): `previous`, `staleness`,
  `board`, `list`, `entry`, `history`, `sessions`, `timers`, `coverage`, `prs`, `week`, `mastery`, `recap`, `swipe`, `muscles`. `useCoverage` combines the active
  session's sets with the exercise list for the strip. `useActiveSession` (in `lib/hooks/`)
  reads the current session from Dexie through `sessions.ts` and also returns `last` (the
  most recent session); the summary page uses `useSessionSummary`; `timers.ts` also has
  `formatDuration`. `writes.ts` has `logSet`, `deleteSet` and `endSession` (run by Finish), each
  one Dexie transaction with an outbox row; `sessions.ts` has `endMarkerTime` behind the last.
- **Look:** dark only; every color, font and radius is a token in `app/theme.css`. No text
  selection or long-press callout (inputs excepted) and no visible scrollbars, app-wide.

**Not built yet:** the history page.

## Decisions worth remembering

These aren't obvious from the code and shaped later work.

- **Sessions are derived at read time**, not stored (chosen in Ticket 8). A session's id is
  its first set's id. `set_logs.session_id` stays null and the `sessions` table holds only
  manual end markers.
- **Hard Rule 2 was reworded twice.** Ticket 8: there's still no "Start Workout", but an
  optional **End session** button is allowed, writing an end marker (`ended_at`) to `sessions`;
  Ticket 11 built it as one tap with a Resume that deleted the marker. **Ticket 15 (the user's
  choice) changed it:** End now only asks (Resume or a red Finish), Finish is final and nothing
  deletes a marker any more. It must still always be available while a session is active and is
  never required; the 90-minute idle rule still closes forgotten sessions.
- **Screens that take an id use a query string** (`/exercise?id=…`, and later
  `/session?id=…`), not `[id]` routes, because dynamic routes aren't prefetched and would
  need the server to open — which fails with no signal.
- **The "‹ Board" link goes back through history**, since a plain link to `/` needs the
  server.
- **Secondary text uses `text-body`, not `text-mute`,** which is too faint in a dim gym.
- **The set-type picker is hidden, not removed from the data** (the user's choice): almost every
  set is a working set, so the log sheet always logs `kind: 'working'`. `SET_KINDS`, `kindLabel`,
  the `kind` column and every rule that reads it (prefill, PRs) are untouched, and old non-working
  sets still show their label in the history, so bringing the chips back is a UI-only change.
- **One chart, by the user's choice.** CLAUDE.md's no-charts non-goal was reworded to allow a
  single session's muscle-balance star; nothing across sessions. Groups are **derived**: `muscleOf`
  maps pattern → group plus a `BY_NAME` table of exceptions (presses, raises, face pull → shoulders;
  calf raises, leg curl → legs), so there's no schema change. A test walks the whole catalogue, so
  a new exercise fails until it's placed. It counts **working sets**, not kilos, so legs don't
  dwarf everything; six axes because the user added Shoulders.
- **Celebration tricks are visual only.** Confetti is a hand-rolled canvas (`Confetti.tsx`, colours
  read from the theme's CSS variables), no dependency. Haptics were ruled out (iOS web has no
  vibration API) and so was sound (headphones in, and Safari blocks audio without a tap).
  `useCountUp` is a display animation driven by `requestAnimationFrame`, not a timer.
- **The session timer lives in the live bar and the live screen** (Ticket 43; before that, the
  board's header). The log sheet shows just the rest timer.
- **Neutral buttons press to `line`,** and only the Log button presses to the lime.
- **`pnpm` isn't on the PATH in Claude's shell:** use `corepack pnpm …` (or the binaries
  in `frontend/node_modules/.bin`).
- **Timers hide when there's no active session.** The seed data is weeks old, so a fresh
  board shows no timers until you log a set. That's correct, not a bug.
- **Timers are `now − timestamp`** (Hard Rule 4): `elapsed()` in `lib/domain/timers.ts`.
  `useNow(500)` repaints twice a second by re-reading `Date.now()`, never by adding to a
  value; 500 ms (not 1000) so a displayed second can't be skipped. It stops while the page is
  hidden and re-reads on `visibilitychange`.
- **Rest = since the last set of any exercise,** not per exercise. The rest timer is
  `text-3xl` (the first try, `text-5xl`, was too big); the session timer stays small and grey,
  so two prominent counters never share a screen.
- `startsNewSession` in `sessions.ts` is the single definition of where a session splits;
  `useActiveSession` reuses it to stop walking the log, so the rule lives in one place.
- **The app on port 3000 was `next start` (production), which never hot-reloads.** After a
  code change: `next build`, then restart it. `pnpm dev` hot-reloads.
- **The session summary is read-only** (delete stays on the log sheet) and opens the session
  that *contains* the id in the URL, so any set's id in a session works, not only its first.
- **Date labels are short** ("13 Sep", "13 Sep 2025"), never "13th of September".
- **The board's "Last session ›" link was removed with its timer** (Ticket 43, per the redesign
  plan). History (Ticket 54) is the way back to past sessions.
- **The End marker time is `max(now, last set)`** (`endMarkerTime`), so it always satisfies
  `last set <= T < next set`, even if a set is stamped in the future. Ending an ended session
  writes nothing, so a double tap is one row.
- **A session's end is the marker, not its last set.** `DerivedSession.ended_at` carries the end
  marker's timestamp (the earliest, if two ever exist), so `summarizeSession` counts the rest after
  your last set. Before that fix the summary reported a finished workout as ending at its last set,
  which showed as "1:40 – 1:40" when the sets were minutes apart. A session the gap closed keeps
  `ended_at: null` and honestly reads first set to last set.
- **Times are hours and minutes,** so a short session's two ends print the same; the summary shows
  one time rather than repeating it, and says "under 1 min" rather than dropping the length.
- **A finished session can't be reopened.** Resume is "go back" before Finish. Nothing is lost by a
  mistaken Finish: every set stays, and the only effect is that the next set opens a new session.
- **The End sheet's safe button sits where End was.** Resume is the lower button, at the same spot
  as End, and the red Finish is above it, so a double tap on End can't finish a session (Finish
  never overlaps that spot during the slide-in either). The sheet uses the card colour; the dimmed
  page (`bg-page/70`) and a shadow set it apart. The red is `--color-negative` `#c0392b`, a warning
  red toned down from a bright one (text-ink on it is 4.9:1). The slide-in animations live in
  `theme.css` and only run under `motion-safe:`.
- **End lives only on the live screen** (Ticket 43; before that, the summary page), one tap from the
  live bar and never beside the pinned Log button where a mis-tap would hurt. Its choice sits in the
  sheet's footer, so Resume lands where End was.
- `useSessionSummary` passes `deriveSessions` only the markers before the next set, so an older
  session never reads as ended because of a later one's marker.
- **The board is your list, not a ranking** (milestone 4, the user's design). `template_items` is
  that list: `exercise_id` for membership and `sort_order` for position, both per the default
  template. `buildBoard` follows it and the recency sort is gone — `staleness` and `previousSet`
  only fill in each row's "150 kg × 10 · 5d" now. CLAUDE.md's board UI rule was rewritten to say so.
- **Reordering lives on the manage screen, not the board** (the user's choice): the board is what you
  read mid-set, so it carries nothing extra to mis-tap. A move rewrites only its own pattern's rows,
  and rewrites them dense (0, 1, 2 …), so positions never drift.
- **Dragging is hand-rolled on pointer events, with no library** — the app has six runtime
  dependencies and dnd-kit is ~40 kB for one list. `dropIndex` in `lib/domain/list.ts` does the
  arithmetic (which row a drag has landed on) and is pure and tested; the component only measures
  the DOM. A drag needs three things that each cost a bug if missed: `touch-action: none` on the
  handle **alone** (so the list still scrolls), pointer capture (so moves keep coming when the finger
  leaves the handle), and showing the dropped order immediately — clearing the drag before the write
  lands makes the list snap back for a frame and the row jump twice. That optimistic order must
  expire the moment the read changes, or a later move writes correctly but never appears.
- **Only the handle that started a drag may finish it.** Without that, a second finger on another
  handle drops the wrong row wherever it happens to be.
- **There is no auto-scroll while dragging:** with a list taller than the screen a row moves only as
  far as the screen reaches in one gesture. Ten rows fit on a phone; fifteen would take two drags.
- **Adding and removing are one tap, with no confirmation,** because nothing can be lost: removing
  an exercise from your list keeps all its sets, and re-adding brings the history straight back.
- **The manage screen is one list, not two** (the user's redesign, Ticket 30): picks and catalogue
  share a `<ul>`, split by `splitPicks`. `useFlip` slides rows only when membership changes, never on
  a reorder, so it can't fight the drag. For 400ms after a toggle, taps are ignored, because the row
  that slides under your thumb would otherwise be toggled by a double tap. No instruction lines:
  the page is just its title, the search and the list.
- **The Add control is quiet once a group has exercises:** a `+` icon beside the heading (an inline
  SVG, `currentColor`, 44px tap area), not a full-width button — that's kept for an empty group,
  where it's the only thing to do. The heading row centres rather than aligning on the baseline,
  because an SVG's baseline is its bottom edge and the icon would otherwise float above the title.
- **A fresh install picks nothing.** The default template is created empty, so the board starts
  empty rather than guessing. Adding puts an exercise at the end of its group (`nextSortOrder`),
  so it never disturbs an order you set.
- **The catalogue grows by editing `CATALOGUE` in `lib/seed.ts`.** The Dexie v2 migration adds
  whatever a device hasn't got, matched **by name** because ids are generated per seed run. It
  never deletes: an exercise you don't want is just one you don't add. (Dexie numbers IndexedDB
  versions ten times its own, so v2 reads as 20 in the browser.)
- **Coverage counts any kind of set** (warmups included, like `staleness`), takes no template, and
  is never a target. It shows only while a session is active, so a row of untouched patterns
  never reads as failure. Untouched pills carry no dash or mark, by the user's choice: the ✓ and
  the tint are the only signal. Six pills including Core wrap to two rows at phone width.
- Tickets 7, 12, 16 and 22 (the on-device checks for milestones 1–4) have no code commit: the
  user confirmed each by hand on the iPhone.
- **Milestone 5 has two decisions of the user's baked into the plan** (`tickets.md`): the week is
  shown with *no target* — the weekly ring was dropped for a plain calendar of trained days
  (Ticket 26), since an empty arc against a number is loss aversion however it's worded; and a PR
  is marked *permanently* in history (Ticket 25), not only flashed, which `detectPR` allows because
  a set is only ever judged against sets strictly earlier than itself, so beating a record later
  doesn't unmark the set that held it.
- **PR kinds don't collapse into one "best set" score.** Weight and reps are compared like-for-like
  (reps only against the same weight, so a light high-rep set can't steal a heavy set's record);
  e1RM is the only kind that can stand alone, for a new-weight set that's plainly better without
  being heavier or higher-rep. `historyPRs` does one oldest-first pass per exercise so the flash
  (Ticket 24) and the history pills (Ticket 25) can't disagree — both come from `judge()`.

- **History is forward compatible** (the user's requirement, now in CLAUDE.md's conventions):
  - Schema changes are additive only.
  - A field added later gets its default in its table's reader, so old rows are never rewritten.
  - An unknown pattern or kind falls back (`accessory` / `working`) instead of dropping the row.
  - Pushes send only known columns, so an old app can't blank a newer column.
  - Frozen `fixtures/history-vN.json` files must keep reading with nothing lost.
- **Milestone 6 decisions (the user's):** Vercel as a static export, sign-in by an email plus a
  6-digit code (iOS opens magic links in Safari, not the home-screen app), and the fake seeded sets
  dropped before the first backup. Sync comes before install because the installed app is a new
  origin with empty storage: history crosses only through Supabase.
- **Seeded sets were found through the outbox.** Every real set got an outbox upsert in the same
  transaction, and the seed never wrote one. That test (`seededSetIds`) holds only because nothing
  had flushed the outbox yet, which is why it runs in the v3 upgrade and nowhere else.
- **No foreign keys between the Supabase tables.** The outbox pushes in write order, and the
  catalogue was queued after the sets that use it, so an FK would block the queue.
- **`synced_at` is the pull cursor, not `updated_at`,** because a late push carries an old
  `updated_at`. The server sets it on every accepted write. Deletes don't travel between two
  devices in use at once (there are no tombstones), which is fine with one phone.
- **The pure sync module is `lib/domain/replica.ts`,** not `domain/sync.ts`: the rule check (and a
  reader) would take it for the forbidden `lib/sync` layer.

- **Sign-in is the one written exception to Hard Rule 5** (the user's choice): `/account` awaits
  Supabase auth and says "No signal…" offline. The UI reaches sync only through `lib/hooks`.
- **Friends can sign in, each with private data** (CLAUDE.md's intro now says so). Supabase's
  built-in email reaches only the project's team, and editing templates needs custom SMTP, so
  email codes go through Resend. Without a domain it reaches only the user; a domain later opens
  it to friends with no code change. Google (built, setup deferred) needs no email at all.
- **Email codes, not magic links,** because iOS opens links in Safari rather than the installed
  app. The code field keeps digits only, and 6–10 of them count as a code.
- **One owner per phone:** the first account to back up claims the phone's data, so a friend
  signing in on your phone can't receive your history. A rejected row stays queued and never
  blocks the others; a batch the server refuses is retried row by row. Postgres won't upsert
  one id twice in a statement, so `pushBatches` sends one row per id.

- **A fresh device adopts, and repair is the safety net.** A device with no sets and no markers,
  signing in to an account that has data, drops its own untouched catalogue and list (plus their
  outbox rows) and pulls the account's. When that can't happen (two devices both used before
  signing in, an old tab), `repairDuplicates` merges the copies:
  - it's deterministic: the lowest id is kept, so every device reaches the same answer;
  - extra exercises are **archived, not deleted**, because deletes don't sync;
  - sets move to the kept twin of their exercise;
  - lists merge in order, and exact duplicate picks are removed.
- **Pull cursors live in Dexie (`sync_state`, v4), not localStorage,** so if Safari evicts the data,
  the cursors go with it and the next pull starts over. A pull re-reads the minute before its
  cursor, to catch rows committed late, and pages by `(synced_at, id)`.
- **Pulled rows write no outbox rows.** A row with any queued local change is skipped by the pull,
  so a set deleted offline never comes back.

- **The app is a static export with a hand-rolled service worker** (Ticket 38), not next-pwa or
  Serwist.
  - `scripts/build-sw.mjs` precaches every file in `out/` under a content-hashed version.
  - Screens are cached under their **clean** address (`/exercise`, not `/exercise.html`): the host
    redirects `.html` to the clean address, and iOS refuses a redirected answer from a service
    worker.
  - Navigations ignore the query, so `/exercise?id=…` and `/account?code=…` open offline.
  - Other origins are never touched.
  - A new version activates at once but keeps the previous cache, so a screen opened under it
    still finds its files.
- **Literal colours live outside the rule check on purpose:** `app/manifest.webmanifest` (JSON) and
  the icon PNGs mirror `--color-page` and `--color-primary`. `theme.css` says so.

- **The redesign (milestones 7–10) was split and decided by the user** (Ticket 40):
  - four milestones, each ending in an iPhone check, not the design doc's single milestone;
  - the Me tab keeps the `/account` URL, because Supabase's Redirect URL and the cached page point
    there;
  - sheets are query params on the current page (`?log=`, `?live`, `?edit=`), opened with
    `history.pushState`, and the `/exercise` and `/exercises` pages stay for old links;
  - the rest time counts up with no ring, since a ring adds a target;
  - the muscle star keeps its six muscle groups;
  - the week strip moves to the board, and to the summary's bottom;
  - "Last time" follows the gap rule on the exercise's own sets, not the calendar day;
  - there's no schema change or Dexie version bump in milestones 7–10.

- **Redesign build decisions (Tickets 41–48):**
  - The tab bar shows only on the three tab pages, so it never fights a page's own pinned button.
    It renders a spacer in the page, so content scrolls clear of it.
  - **Backup paused keeps its meaning:** the phone's sets belong to another account. So the Me card
    says to sign out and sign in with that account, not Figma's "Sign in again". There's no "last
    backup 2 min ago", because no backup time is recorded.
  - A sheet's content scrolls, and its footer slot doesn't. The entry form portals its Log button
    into the footer inside a sheet, and pins it to the screen on the full page (`useSheetFooter`).
  - A sheet drags down only from its grab strip, so the content still scrolls under a finger.
  - **"Today" is this lift's sets in the active session.** With none active, today is empty and
    the latest session is last time.
  - **Editing a set keeps its `logged_at`** (Ticket 46), so the session, timers and set number
    don't move, and the PRs recompute because they're derived.
  - **Undo restores the same row** (same id and time) rather than logging a new one. The outbox
    carries the delete and then the re-insert, in order.
  - **Only today's rows are editable for now.** Past sets become editable with History's exercise
    detail (Ticket 55), which reuses `updateSet` and `restoreSet`.
  - **Saving an edit shows no record banner**, which belongs to the moment of logging. The PR pill
    still follows.
  - **An edit carries on to later sets** until the sheet closes, which is how Figma shows 82.5
    prefilled against last time's 80.
  - The PR pill is record yellow everywhere, as in Figma.
  - Inside a sheet the surface is `page` and the blocks are `card` (darker, the user's choice;
    it looked washed out on `card` + `raised`).

- **Board decisions (Ticket 50):**
  - **"Today" means the running session,** not the calendar day. A row returns to `Last:` the
    moment the session ends, by Finish or the gap.
  - **"Best" is the heaviest working set.** At the same weight, more reps wins; then the earlier
    set. With only warmups today, the best of those is shown. e1RM was passed over, since it can
    pick a set that isn't the heaviest.
  - **No level on board rows** (the user's choice, right after Ticket 50: too much text in the
    row). The level stays on the log sheet. So `useBoard` reads just each lift's newest set and
    newest working set again, and rebuilds on a new set, the session ending, or a new minute, never
    on the timers' half-second repaint.
  - **No `Last:` / `Today:` labels, no "best", no `New`** (the user's choice): grey means last
    time, lime with a tick means today. CLAUDE.md's board rule was reworded to match.
  - **Row text is `text-body` for last time,** following CLAUDE.md's board rule. The quieter
    `text-mute` from the UI polish after Ticket 30 is gone.
  - **A group with no picks is hidden,** so its `+` goes with it. Edit, or the empty board's card,
    reaches the other patterns.

- **Edit board decisions (Tickets 51 and 57):**
  - **A page, not a sheet** (the user's choice). A sheet version (`?edit=`) was built first and
    taken out before commit. CLAUDE.md's Navigation paragraph says edit board is never a sheet.
  - **No back button and no Done** (the user's choice): changes save as they're made, and you swipe
    back. **Unconfirmed:** whether iOS offers the edge swipe in the installed home-screen app. The
    tab bar doesn't show on this page, so if it doesn't, the fix is to show the tab bar here.
  - **Custom exercises were pulled forward** from milestone 10 (the user's choice). No schema
    change: the row is an ordinary `exercises` row (`user_id` local, 120 s rest), `muscleOf` places
    it by its pattern, and sync backs it up like the catalogue.
  - **A custom name must be new** (`customName` in `lib/domain/custom.ts`): trimmed, inner spaces
    collapsed, capped at 60 characters, and matched against the catalogue ignoring case. Two lifts
    of one name would split your history, and repair merges by name anyway.
  - `pickCounts` (in `list.ts`) feeds the chips: every pattern present, a lift listed twice counted
    once.

## Log

Newest first. One entry per commit, matching `git log`; hashes are left out because an
entry is written in the same commit it describes.

### Record banner as a toast (after Ticket 52)
`bugfix: Show the record banner as a toast at the top` · 2026-09-30 · branch `redesign`

- The banner sat in the log sheet's flow and pushed the set table down when it appeared; the user
  asked for a toast instead.
- `RecordBanner` now portals to the body, fixed at the top below the safe area (z-40, over the
  sheet), with a shadow. Still `pointer-events: none` and gone after 3 s, so it never blocks.

### Darker log sheet (after Ticket 52)
`bugfix: Darken the log sheet — page behind, card blocks` · 2026-09-30 · branch `redesign`

- The user found the log sheet washed out, so every sheet surface moved down one step: the sheet
  is `bg-page` and its blocks (entry, set table, set rows, history) are `bg-card`.
- The live session shares the same sheet, so its blocks moved too, to match.
- No token values changed; `raised` stays for the board and edit board.

### Ticket 52: Summary and finish deck — to the user's mock-ups (plus the board's PR pill)
`feature: Rebuild the session summary and finish deck to the mock-ups` · 2026-09-30 · branch
`redesign`

- The plan was a stat row and open rewards; the user then sent mock-ups, and both screens were
  rebuilt to them. The deck is full screen (Session done, Rewards, Muscles) with Next/Done; the
  summary is a History page with `‹ History`, the stat row, Rewards, Muscles and Exercises.
- New pieces: `StatRow`, `RewardList`, `RecordChange` (one record line, shared by the rewards and
  the pop-up), `MusclesCard`, `useSessionNumber`. `SessionRecap` is gone.
- Domain: `totalKg` and `sessionStats` in `recap.ts`, `sessionNumberInWeek` in `week.ts`,
  `recordParts` / `formatLongDay` / `formatOrdinal` / `formatWhole` in `format.ts`.
- The user's corrections: no text beside the star and no counts in it, a smaller star; record
  text small, no "Heaviest" labels, the yellow not bold, one line with no "…"; a reps record names
  its weight before the arrow.
- Board: a row whose lift broke a record today shows a yellow PR pill instead of the tick
  (`rowState`'s `record`, fed from `useSessionRecap` in `useBoard`).
- Fixed: the deck didn't open when finishing from the summary's own live sheet (the flag is now
  watched during render).
- The sheet colour change and the pop-up's move to a portal are someone else's work in progress
  and were left out of this commit.
- 453 tests. Checked in headless Chrome at 390 × 844; not on the iPhone yet (Ticket 53).

### Tickets 51 and 57: Edit board page — scrolling chips, custom exercises
`feature: Make edit board a page with scrolling chips and custom exercises` · 2026-09-30 · branch
`redesign`

- Built first as a sheet over the board (`?edit=`); the user wanted a page, so the sheet was taken
  out before commit and CLAUDE.md says edit board is never a sheet.
- `ExercisePicker` is the page:
  - "Edit board" with `+ New`;
  - a search box with a magnifier;
  - one sideways-scrolling row of small chips with pick counts and a ✓ on the selected one;
  - the chip in `?pattern=` via `replaceState`;
  - no back link and no Done (the user's choice);
  - smaller `On board ✓` / `Add` pills.
  `PatternList` (drag, `useFlip`, the 400 ms guard) is unchanged.
- Ticket 57, pulled forward:
  - `customName` (new `lib/domain/custom.ts`) and `addCustomExercise` in `writes.ts`, one
    transaction with the exercise, its list entry and both outbox rows;
  - the form offers an existing lift instead of a duplicate.
- `pickCounts` in `list.ts`. 8 new tests (444 in total).
- Checked in headless Chrome at 390 × 844:
  - the empty card, Edit and `+` opening the right chip;
  - chips scrolling sideways and not adding history;
  - an offline reload keeping the chip;
  - "Zercher Carry" created under Accessory with both outbox rows and shown on the board;
  - "bench PRESS" recognised as Bench Press.
- Not checked on the iPhone yet (Ticket 53), including whether the installed app can swipe back.

### Board rows, quietened (after Ticket 50)
`bugfix: Quieten board rows — tick badges, shorter lines, no level` · 2026-09-30 · branch
`redesign`

- The user found the rows cramped once they were on the phone, and chose the fixes one by one:
  - the level is gone from the row, so `useBoard` is back to two reads per lift;
  - no labels: `82.5 kg × 5 · 4d` in grey, `3 sets · 102.5 × 5` in lime (`formatSetShort`);
  - a lift never done is just its name;
  - the second line is 13 px.
- `CheckBadge` (new): a pale-green circle with a lime tick, on a touched pattern heading and on a
  row done this session, matching the user's mock-up.
- The board's **Edit** is plain lime text, like `+ New` on the edit board page.
- CLAUDE.md's board rule now describes these rows.
- The level test left `board.test.ts` (436 tests).
- Checked in headless Chrome at 390 × 844, with sets planted for all three row states.

### Ticket 50: Board — date header, week strip, pattern ticks, two row states
`feature: Show today and last time on board rows, with the week and pattern ticks` · 2026-09-30 ·
branch `redesign`

- The first ticket of milestone 9. The board answers "what have I done today" and "how's my week"
  with no extra tap.
- `board.ts`:
  - `rowState(exerciseId, sessionSets, history, now)` returns `today`, `last` or `new`;
  - `BoardRow` carries `state` and `level` in place of `lastSet` and `daysSince`;
  - `buildBoard` takes the session's sets.
- `useBoard` reads each picked lift's full history, and takes the session from
  `useActiveSession`.
- `Board`:
  - the date header and Edit;
  - `WeekStrip` on top (its `sessionId` is now optional);
  - `useCoverage` feeds the heading ✓;
  - the empty-board card.
  `CoverageStrip` left the board. `PatternGroup` lost its empty-group branch.
- `formatDay` in `format.ts` for `Wed 30 Sep`.
- 8 new tests (437 in total).
- Checked in headless Chrome at 390 × 844 with touch:
  - the empty card on a fresh install;
  - picking three lifts and planting a set from 4 days ago gave `Last: 100 kg × 5 · 4d` and
    `New`;
  - logging a set gave `✓ Today: 1 set · best 100 kg × 5`, `Squat ✓` and today ringed, with no
    row moving.
- Not checked on the iPhone yet (Ticket 53).

### Ticket 49: On-device check — milestone 8 on the iPhone
2026-09-30 · branch `redesign` · no code commit (like Tickets 7, 12, 16, 22 and 44)

- The user ran the milestone 8 checklist on the iPhone: the set table's Last time column and
  per-set prefill, editing a today row in place, undo after a swipe-delete, Next up swapping in
  place, and the record banner — all under airplane mode, and the rest timer surviving a phone
  lock/unlock. Everything passed with no fixes needed.
- Milestone 8 is closed. CLAUDE.md's current milestone is now 9 (Board, picker and summary).

### Ticket 46: Edit and undo — fix a set in place, take back a delete
`feature: Edit a set in place and undo a delete` · 2026-09-29 · branch `redesign`

- Milestone 7 closed: the user confirmed the iPhone check (Ticket 44). CLAUDE.md's current
  milestone is 8.
- `lib/writes.ts` gains two writes, each one Dexie transaction plus an outbox upsert:
  - `updateSet(id, {weight, reps})` changes only the numbers and `updated_at`;
  - `restoreSet(set)` puts a deleted set back under its own id.
- `SetEntry.tsx`:
  - a new `SetEdit` has a lime-outlined entry, `Editing set N`, and Cancel / Save set N;
  - the Log form takes `hidden` (it stays mounted, so a carried edit survives) and `above`;
  - a shared `Pinned` puts either footer in the sheet, or pins it on the full page.
- `Snackbar.tsx` (new) shows `Set deleted · Undo` for 5 s. `LogSheetBody` owns the `editingId`
  and the deleted set.
- `SetTable` and `SetHistory` delete through the sheet, so both can undo. `SwipeToDelete` gains:
  - `onTap`, which only fires when the press never committed to an axis;
  - `role="button"`, with Enter and Space;
  - `frameClassName`, so a rounded editing outline doesn't show the red panel at its corners.
- Checked in headless Chrome at 390 × 844 with touch:
  - row 2 opening the editor;
  - Save at +5 kg giving 85 × 5 with a PR pill, where IndexedDB showed the same `logged_at` and a
    second upsert queued;
  - Cancel leaving a set untouched, and a short swipe not opening the editor;
  - a full swipe deleting with the snackbar, and Undo restoring the same id and time (outbox:
    log, delete, upsert);
  - the snackbar leaving after 5 s.
- Not checked on the iPhone yet (Ticket 49).

### Ticket 43: Live session bar and live screen — End moves off the summary
`feature: Add the live session bar and live screen, and move End there` · 2026-09-29 · branch
`redesign`

- `TabBar` holds the live bar above the tabs while a session is active, and its spacer grows to
  match.
- `LiveSession.tsx` (Figma 4.1–4.2):
  - the session clock, rest and set count;
  - `CoverageStrip`;
  - an exercise card per lift from `useSessionSummary`;
  - `EndControls` in the sheet's footer.
- `SheetHost` also opens `?live`, in the same `Sheet`, so a card swaps to a log sheet in place.
  `lib/sheets.ts` gains `live` and `forgetSheet`.
- Finish runs `endSession`, then `router.replace` to `/session?id=…&finished=1`. `SessionSummary`
  reads the flag once to play the deck and drops it with `replaceState`, and it opens `?live` for
  a session still running.
- `SessionEndBar.tsx` and `SessionHeader.tsx` are deleted, which takes the board's session timer and
  "Last session ›" with them. The untouched coverage chips use `raised`, so they show on the sheet.
- Checked in headless Chrome at 390 × 844:
  - the bar after a set, and following me to History;
  - the live screen's contents;
  - a card swapping to Bench Press with no extra history entry;
  - End → Resume in the same spot (y 800) → End → Finish landing on the summary with the deck;
  - a reload showing no deck, and back returning to History with the bar gone.
- Not checked on the iPhone yet (Ticket 44).

### Tickets 41, 42, 45, 47 and 48: the tab bar, Me tab, sheets and the set table
`feature: Add the tab bar, Me tab, sheets and the set table` · 2026-09-29 · branch `redesign`

- One commit on the `redesign` branch, which is pushed but not merged into `main`. It holds the
  first five redesign tickets. Tickets 43, 44, 46 and 49 are still to come.
- **Ticket 41:**
  - `TabBar`: Train, History and Me, with a badge only for paused.
  - `MeScreen` replaces `AccountForm`, following Figma 6.1–6.3, with `useLocalStats`, and
    `useOnline` / `useStandalone` in `useDevice`.
  - `BackupLine` is gone, `Account` gains `email`, and there's a placeholder History page.
- **Ticket 42:**
  - `Sheet` has a scrim, a grab strip with swipe-down (`dismissOffset` / `dismissOutcome` in
    `swipe.ts`), Escape, a scroll lock and a footer slot.
  - `SheetHost` in the layout reads `?log=`, and `lib/sheets.ts` opens and closes sheets through
    `pushState`.
  - `LogLink` opens the sheet from board rows and summary cards.
  - `LogSheet` is split into `LogSheetBody`.
  - New tokens: `raised` and `sheet-up`.
- **Ticket 45:**
  - `previousSession` (in `previous.ts`) and `prefillFor` (in `entry.ts`).
  - `SetTable`.
  - `SetHistory` folded under Earlier.
- **Ticket 47:** `nextUp` (in `board.ts`), `useNextUp` and `replaceSheet`.
- **Ticket 48:** `RecordBanner` replaces `PRFlash`, with `recordLine` and `formatSetShort` in
  `format.ts`. PR pills turn yellow.
- 18 new tests (429 in total).
- Checked in headless Chrome at 390 × 844 with touch events:
  - the tab bar's pages;
  - Me offline;
  - the sheet opening, logging and closing by back, swipe and scrim with the board's scroll kept;
  - a reload onto `?log=` online and offline;
  - with three bench sets seeded three days back: prefill per set, a weight record banner that
    didn't block the next tap, Next up swapping in place, and Earlier opening.
- Not checked: the signed-in and paused Me cards, and the iPhone.

### Ticket 40: Redesign rules — close milestone 6, plan milestones 7–10
`docs: Close milestone 6 and plan the redesign as milestones 7–10` · 2026-09-29

- Ticket 39 is done: the user confirmed the milestone 6 run-through on the iPhone.
- CLAUDE.md gains the redesign's UI wording, which the user approved in the design doc:
  - the board's date header, week strip, pattern ticks and two row states;
  - the log sheet as a sheet, with a set table and Next up;
  - a Navigation paragraph (three tabs, the live bar, sheets as query params);
  - "Rewards never block".
- CLAUDE.md also gains `previousSession` in the domain contract, the new routes and components in
  the tree, build steps 7–10, and current milestone 7. The Hard Rules and non-goals are unchanged.
- `tickets.md` has milestones 7–10: Tickets 40–58, with the decisions and what each ticket builds
  from.

### The user's own app icon
`feature: Use the neon arrow-and-ring artwork as the app icon` · 2026-09-28

- The user supplied a 2048×2048 image: a neon green ring of plates with an arrow breaking out, on
  near-black. `sips` resized it into `app/apple-icon.png` (180), `app/icon.png` (64) and
  `public/icons/` (192, 512 and maskable 512). The art already sits inside the maskable safe
  zone, so it needed no padding.
- The icon is artwork now, not drawn from the theme tokens. `theme.css` and the README say so,
  including that iOS needs the app removed and re-added to show a new icon.

### Vercel publishes the static export as built
`bugfix: Deploy out/ as built on Vercel so the service worker ships` · 2026-09-28

- The first deploy (https://overload-three-zeta.vercel.app) served every screen, but `/sw.js` was
  a 404: Vercel's Next.js pipeline serves Next's own output and skipped the worker that
  `build-sw.mjs` writes into `out/`.
- `frontend/vercel.json`: `framework: null`, `buildCommand: pnpm build`, `outputDirectory: out`,
  `cleanUrls` (so `/exercise` serves `exercise.html`, as the worker expects), and `no-cache` on
  `sw.js`.

### Release 1.0.0 — first launch
`chore: Release 1.0.0 — version, changelog and an up-to-date README` · 2026-09-28 · tag `v1.0.0`

- The first installable version. `frontend/package.json` is now `overload@1.0.0`, and the single
  source of the version. `next.config` bakes it in as `NEXT_PUBLIC_APP_VERSION`, and the Back up
  screen shows "Overload 1.0.0" small and grey, so the installed app tells you which version it's
  running once updates start arriving.
- `CHANGELOG.md` is new. The README was rewritten to match the app as it is: rewards, sync and
  restore, install, the current layout, the data model with `user_id` / `updated_at` /
  `sync_state`, and all six roadmap steps built.

### Ticket 38: Install — static export on Vercel, manifest, icons, service worker
`feature: Install as an app — static export on Vercel, offline service worker, icons` · 2026-09-28

- `output: 'export'`. `pnpm build` runs `next build`, then `scripts/build-sw.mjs`.
  `pnpm preview` (the `serve` dev dependency) replaces `next start`.
- `scripts/sw-template.js` (about 80 lines): precache on install, keep one previous version on
  activate, pages by path, files cache-first ignoring the query, same-origin GET only, and no push
  handler.
- `useInstall`, mounted by `SyncAgent`, registers `/sw.js` in production and calls
  `navigator.storage.persist()`. Neither awaits anything or stores anything.
- `app/manifest.webmanifest`, the Apple web-app metadata (a translucent status bar over the dark
  page), and the icons: a lime ring on near-black, rasterised with headless Chrome. The
  create-next-app leftovers are gone.
- Checked in headless Chrome with the server **stopped**:
  - a reload of `/`, `/exercise?id=…`, `/account?code=…` and `/exercises` all opened;
  - client navigation from the board into the picker worked;
  - all 64 files were precached, and the manifest parsed with no errors.
- Not checked: whether iOS grants persistence, a version-to-version update, and the iPhone itself.

### Three new catalogue exercises
`feature: Add Seated Leg Curl, Machine Incline Press and Single-Arm Triceps Pushdown` · 2026-09-28

- The user asked for four. Leg Extension was already in the catalogue (Squat), so it was skipped.
  The catalogue is now 76.
- Dexie v5 (no schema change) adds the missing ones on devices that already have the catalogue,
  matched by name, and queues them for backup. Each device gives them its own ids; sync's repair
  merges the copies by name.
- `muscleOf` places Seated Leg Curl in legs. The press counts to chest and the pushdown to arms,
  by pattern.
- Checked against a fake IndexedDB: v4 → v5 adds the three once, queues them once, and a reopen
  changes nothing.

### Google-only sign-in on screen
`chore: Hide the email code sign-in and keep it behind a flag` · 2026-09-28

- The user's choice: Google is the one way in for now. The email form and the "or" divider on
  `/account` sit behind `SHOW_EMAIL_CODE = false`, and the Google error no longer suggests an
  email code. `sendCode` / `verifyCode` and the form stay in the code for later.

### Ticket 37: Restore — pull from Supabase into a fresh device
`feature: Restore from Supabase — pull, adopt, and repair duplicates` · 2026-09-28

- `lib/sync/sync.ts` is the single `syncNow` (under the `overload-sync` Web Lock) that the
  triggers and sign-in call.
  - It runs the owner guard, then `adoptIfFresh`, then `drain` (push), then `pullAll`, then
    `repairLocal`.
  - `push.ts` keeps only `drain`.
- `pull.ts`:
  - keyset paging by `synced_at, id`, 1000 rows per page;
  - `toLocal`, then `shouldApply` (last write wins, pending rows skipped);
  - one Dexie transaction per page, written together with the cursor.
- `adopt.ts`: a fresh device drops its own catalogue and list when the account has exercises. It
  checks again inside the transaction.
- `repair.ts`, in the domain and in sync: merges duplicated catalogues and default lists, then
  pushes the merge. It came from a real duplicate on the user's account (146 exercises, two
  default lists).
- Dexie v4 adds the local-only `sync_state` table. There's a new frozen fixture,
  `history-v3.json`.
- `replica.ts` gains `remoteCursor`, `pullSince`, `pendingIds`, `shouldApply` and
  `isFreshDevice`. 31 new tests (411 in total).
- Checked against a fake IndexedDB:
  - v3 → v4 changes no data;
  - adoption with a stubbed account count;
  - repair on a duplicated account, and a second repair changing nothing.
- **Not yet confirmed on devices.** Google redirects need the tunnel address in Supabase.

### Ticket 36: Back up — sign in with Google or an email code, and push the outbox
`feature: Back up to Supabase — sign in with Google or an email code` · 2026-09-25

- `/account` (static): Continue with Google (PKCE; the page exchanges `?code`), or an emailed
  code. It has plain messages for offline, a wrong code and an unfinished Google sign-in, and
  Sign out. `BackLink` gained `direct`, so after Google, "Board" doesn't go back to Google's page.
- Background push, all in `lib/sync/`:
  - `push.ts` drains the outbox in write order with `pushBatches`. It's single-flight within a
    tab and across tabs (Web Locks). Rows are cleared only once accepted. It stops on offline,
    401 or 5xx, and retries row by row on a rejection.
  - `triggers.ts` handles open, online, visibility, sign-in, and 3 s after an outbox write.
  - `auth.ts` and `owner.ts`.
- Hooks: `useSyncAgent` (mounted by `SyncAgent` in the layout), `useAccount` and
  `useBackupStatus`. The board line is `BackupLine`.
- `lib/domain`: `pushBatches` in `replica.ts`, and `signin.ts` (email and code helpers,
  `canPush`, `backupState` / `backupLabel`). 18 new tests.
- Google's "G" (`GoogleMark`) uses four `google-*` tokens in `theme.css`, the one place the
  palette isn't ours.
- Checked in headless Chrome: the line and the page, offline messages, the Google hand-off
  reaching Supabase (the provider isn't enabled yet), and a failed Google return. The user then
  signed in on the phone with an email code.

### Ticket 35: Sync foundation — Supabase schema, RLS, and a local store ready to back up
`feature: Lay the sync foundation — Supabase schema and a clean local store` · 2026-09-24

- Milestone 6 is broken into Tickets 35–39 in `tickets.md`, with the user's decisions (Vercel,
  email code, drop fake sets, forward compatibility).
- Dexie v3 upgrade:
  - `template_items` gain `user_id` / `updated_at`;
  - production deletes the seeded sets (those with no outbox upsert);
  - the catalogue, template and list are queued.
- Fresh production installs seed no fake sets.
- `lib/domain/rows.ts` holds a reader per table (defaults, fallbacks, ISO or ms times), run on
  every Dexie read.
- `lib/domain/replica.ts` holds `toRemote` / `toLocal`, `newerWins`, `seededSetIds` and
  `unqueuedRows`. `lib/outbox.ts` is shared by writes and migrations.
- Supabase migration: five tables, RLS per user, the `sync_stamp` trigger (last write wins plus
  `synced_at`), and the set_logs index. `@supabase/supabase-js` is added. `lib/sync/supabase.ts`
  returns null when unconfigured.
- 41 new tests, including the frozen `history-v1.json` fixture.
- Checked against a fake IndexedDB:
  - v2 → v3 keeps the logged sets, drops the seeded ones and queues each row once, and a reopen
    changes nothing;
  - a fresh production install has no sets;
  - the reading hook fills pre-v3 items on `get`, `where`, `bulkGet` and `toArray`.
- Checked in Supabase: all five tables exist and refuse anonymous access.

### Milestone 5 closed
`docs: Close milestone 5 and move on to sync and install` · 2026-09-24

- The user ran the milestone 5 checklist on the iPhone (Ticket 32) and everything passed. CLAUDE.md's
  current milestone is now 6; milestone 6 has no tickets yet.

### Ticket 34: Muscle balance — a six-point star of what the session leaned on
`feature: Show the session's muscle balance as a six-point star` · 2026-09-24

- The user wanted to see which muscle groups a session leaned on, as a star. Charts were a
  non-goal; the user chose a one-session exception, now written into CLAUDE.md.
- `lib/domain/muscles.ts` (pure, 9 tests): `muscleOf`, `muscleBalance` (working sets per group from
  `SessionSummary.groups`, no new reads) and `topMuscle`. `recapCards` takes `withMuscles` and puts
  the Muscles card second.
- `MuscleStar` is a hand-drawn SVG (hexagon rings, spokes, a lime polygon that grows from the centre
  under `motion-safe:`); labels stack the name over the count so "Shoulders" fits at phone width.
  The summary's `Fold` takes a `detail` string so the row can read "Muscles · Legs".
- Checked with CDP: the deck order, the star's counts against the sets logged, and the fold.

### Ticket 33: Celebrate the finish — confetti burst and a rolling total
`feature: Celebrate Finish with a confetti burst and a rolling total` · 2026-09-24

- The user wanted a celebration when a session ends. Built on a `confetti` branch as a trial, then
  kept. Two canvas "cannons" fire ~120 pieces in the theme's lime, yellow and ink when the recap
  deck opens; `pointer-events: none`, cleared after ~3 s, skipped under reduced motion.
- The first card's total rolls up with `useCountUp` (ease-out cubic, 900 ms).
- Checked with CDP: the total reads 861 → 1,693 → 2,043 → the exact 2,044 kg, the canvas is empty by
  3.5 s, Done works mid-burst, and with reduced motion emulated there's no confetti and the exact
  total at once.

### Log sheet and record flash polish
`bugfix: Quieten the log sheet and make the record flash readable` · 2026-09-24

- Log sheet: the set-type chips are gone (every set is `working`; `kind` stays in the data) and the
  session timer is gone (board only), leaving the rest timer as the one counter. History times
  are small and grey on the right; the ± signs are drawn SVGs so they sit centred.
- The PR flash was hard to read as a lime card. It's now a dark-yellow card (new `record` /
  `record-pale` tokens, every text on it ≥ 4.5:1) that drops in at the top over a dimmed page,
  portalled to `<body>`. Each line reads `old → new`, with "was" dropped and the new value loudest;
  `prValues` became `prAmount`.
- The level label is shorter (`5 to Level 6`); the summary drops the cramped "Finished" line; text
  selection, the long-press callout and scrollbars are off app-wide.

### Ticket 31: The finish moment — swipeable recap cards when you tap Finish
`feature: Celebrate Finish with swipeable recap cards` · 2026-09-24

- The user wanted Finish to feel like an achievement. `RecapMoment` dims the page and shows a deck:
  total, then records and level-ups paged by `recapCards` (new in `lib/domain/recap.ts`, 5 tests).
  The swipe is native horizontal scroll with snap, so no gesture code; the page behind is locked
  (`overflow: hidden`, `touch-action: none` on the scrim) and taps around the cards fall through to
  the scrim to close.
- It opens from `SessionEndBar`'s new `onFinished`, held as `celebrating` state in
  `SessionSummary`, which now calls `useSessionRecap` once (it accepts null). Nothing is stored, so
  a reload or a gap-closed session never shows it.
- The summary's recap folds Records and Levels in native `<details>`. Two follow-ups from the
  user: the first card is dark with the numbers in bold lime (not a lime card), and level-ups are
  the exercise name plus a **gold** badge (new `level` / `level-pale` tokens) with a double arrow
  that hops twice — gold so levels read apart from the green of records.
- Checked with CDP: four cards for five records and two first-ever lifts ("1 of 2" paging), a
  touch swipe snapping to card 2, the last dot jumping to Levels, the page behind not scrolling,
  a scrim tap closing, the folds, and no overlay on revisit.

### UI polish after Ticket 30
`bugfix: Quieten board rows, retire the blue selection, fill a finished day` · 2026-09-24

- Log sheet: tapping weight or reps no longer selects the number (iOS painted it blue) or shows a
  focus box. The field empties with the value as a faint placeholder, the ghost colour; typing
  replaces it, and leaving it empty (or typing then deleting) keeps the value it had.
- Board rows: the white last-set value clashed with the name, so the value and its age are now small
  and `text-mute` (the one place that token carries secondary text, by the user's choice), with a
  `›` chevron; a lift never done shows no dash.
- Week strip: the session's own day is an outline only while the session is live (same
  `useActiveSession` clock as the End bar and recap) and fills once it's over.

### Ticket 30: One list — pick and order your exercises in the same list
`feature: Pick and order your exercises in one list` · 2026-09-24

- The user redesigned the manage screen: no separate **Your order** block. Picks (green, with
  handles, in your order) come first and the rest of the catalogue follows as neutral rows; Add
  slides a row up to the end of the picks, removing slides it back to its catalogue place.
- `splitPicks` in `lib/domain/list.ts` (4 tests). `useFlip` (new, `lib/hooks/`) is a hand-rolled
  FLIP: page positions so scrolling isn't a move, and a mid-slide row starts from where it visibly
  is. `PatternList` replaces `OrderList` + `CatalogueRow`, keeping the drag, the optimistic dropped
  order and the arrow keys; the drag transform sits on an inner element so it never fights the
  slide.
- Also folded in: the page's second heading (the pattern name repeated) and both instruction lines
  are gone.
- Checked with CDP taps and touch drags: adds landing last with the next `sort_order`, a
  frame-by-frame slide over ~250ms, a double tap adding one, a drag to the top written densely and
  followed by the board, removal back to the catalogue slot, vertical scroll on neutral rows,
  ArrowUp on a handle, handles hidden while searching, and all six sections under "Show every
  pattern".

### Ticket 29: Swipe to delete — swipe a set left in the history to delete it
`feature: Swipe a set left in the history to delete it` · 2026-09-24

- The user asked for swipeable rows; no dependency, the same hand-rolled pointer-event approach
  as the drag reorder. `lib/domain/swipe.ts` decides: `gestureAxis` (commits to swipe or scroll
  once past 10px, and a scroll stays a scroll), `swipeOffset` (left only, clamped) and
  `swipeOutcome` (past halfway, or a flick over 0.5 px/ms that travelled 40px). 13 tests.
- `SwipeToDelete` wraps each history row over a red Delete panel, with `touch-action: pan-y` so
  the browser keeps vertical scrolling. A pause before lifting cancels a flick. Reduced motion
  deletes without the slide.
- The ✕ buttons are gone; an `sr-only` Delete button shows on focus for VoiceOver and keyboards.
  The device check was renumbered to Ticket 30.
- Checked with CDP touch events: 40% springs back, a vertical drag scrolls, a right swipe and a
  25px flick do nothing, a 70px flick and a 60% swipe delete (with outbox rows), and the focused
  button deletes.
- **Port 3000 on this machine is `next start`**, so after a change it needs `next build` and a
  restart before the phone sees it (the tunnel forwards 3000).

### Ticket 28: Session recap — what the workout was worth, on the summary once it's over
`feature: Show a recap on the session summary once it's over` · 2026-09-24

- The user chose the summary over a separate `/recap` page: Finish turns the summary into the
  recap in place, so there's no new route to preload for offline. CLAUDE.md's build step 5 says so.
- `lib/domain/recap.ts`: `sessionRecap(session, history)`: total kg (Σ weight × reps, warmups
  included, bodyweight 0), `sessionPRs` judged against the sets before the session, and level-ups
  (`masteryLevel` before vs through the session). 10 tests.
- `useSessionRecap` reads each exercise's history up to the session's last set through the
  `[exercise_id+logged_at]` index. `SessionRecap` decides "over" from `useActiveSession`, the same
  live clock as the End bar, so a gap-closed session's recap appears the instant the bar goes.
- `PRPill` moved to its own component, shared by the history and the recap. `SessionEndBar`
  scrolls to the top after Finish.
- Checked in headless Chrome: a seeded gap-closed session (8,508 kg against the rows' 8,507.5, two
  records, six lifts to Level 3), no card while active, and End → Finish showing the recap with a
  new record and a first-ever lift at Level 1.

### Ticket 27: Mastery levels — how long you've been doing a lift
`feature: Add mastery levels to the log sheet` · 2026-09-24

- `lib/domain/mastery.ts`: `masteryLevel(exerciseId, logs)` counts the distinct local days you did
  a lift (any set) and turns them into a level that only rises — level L at L·(L+1)/2 sessions, so
  1, 3, 6, 10, 15 … with no cap. 18 tests, run in three timezones.
- `useLogSheet` computes it from the history it already reads; no new query. The seed tops out at
  6 days per lift, so seeded lifts sit at level 3 or below.
- The user found a second header line too cramped, so `LevelBadge` shows just `Level 3`
  (dotted underline) and a tap reveals the sessions line as a small label; a tap anywhere hides it.
- Also at the user's request: board rows no longer say "today", only `2d` and older.
- Squat and hinge were considered for merging into "Legs" and kept apart: the coverage strip's
  value is telling a squat day from a hinge day.

### Ticket 26: Week calendar — the days you trained this week, on the session summary
`feature: Show the week's training days on the session summary` · 2026-09-24

- Replaces the weekly ring, which the user dropped: a plain calendar has nothing to fall short of.
  CLAUDE.md's build order and domain contract, and `tickets.md`, now say so.
- `lib/domain/week.ts`: `weekOf(anchor, setTimes, now)` (seven local days, Monday first, with
  trained / anchor / future flags) and `weekRange(anchor)` (Monday 00:00 to the next). Reuses
  `localDate` / `dayKey`, now exported from `history.ts`. 18 tests, run in five timezones including
  daylight-saving weeks.
- `useWeek` reads one week of sets through the `logged_at` index, live; `WeekStrip` draws it under
  the summary's header. The session's own day is a green outline (the user's choice, after a
  filled-and-ringed first try), other trained days are filled.
- Checked in headless Chrome: the latest seeded session, an older one showing its own week, and
  today's session after logging a set.

### Ticket 25: PR marks — a durable PR pill in the exercise's history
`feature: Mark record sets with a PR pill in the history` · 2026-09-24

- `SetHistory` runs `historyPRs` over the exercise's history (memoised on the history alone, so the
  clock's repaints don't redo it) and a small `PRPill` marks each record set, with the kinds broken
  in its aria-label.
- Permanent by construction: each set is judged only against earlier ones. Deleting an earlier
  record can promote a later set, which is correct — it's now the best of what's left.
- Checked in headless Chrome: seeded records marked, a new heavier set marked, both keeping their
  pills after a heavier one still, a repeat unmarked, and a record surviving the deletion of the
  sets after it.

### Ticket 24: PR flash — the reward the moment you log a record
`feature: Add the PR flash while logging` · 2026-09-24

- `components/PRFlash.tsx`: logging a working set that breaks a record shows a lime "New record"
  card, one line per kind (`prKindLabel` / `prValues` in `lib/format.ts`), anchored just above the
  pinned Log button so the button never moves under a thumb. It closes itself after 4 seconds, on
  a tap, or the moment the next set is logged (keyed by set id, so back-to-back records each get
  their own entrance); nothing about it is stored.
- `SetEntry` calls `detectPR(set, history)` right after `logSet` returns, judging the new set
  against the history the log sheet already held **before** the tap — `useLogSheet`'s `history`
  prop is passed down for this, so no extra Dexie read is needed and the timing can't race the
  live query's own refresh.
- Checked in headless Chrome at 390px: a heavier set flashing, repeating it flashing nothing, an
  extra rep at the same weight flashing reps + e1RM, the flash going by itself after 4s, a heavier
  **warmup** never flashing, and a tap dismissing it early.
- Not yet on the iPhone; that's Ticket 29.

### Ticket 23: PR domain — weight, reps and e1RM records
`feature: Add the PR domain — weight, reps and e1RM records` · 2026-09-24

- `lib/domain/prs.ts`: `detectPR(set, history)` — the records one working set breaks, judged only
  against working sets of the same exercise strictly earlier than it (order-independent, tolerant
  of `history` holding other exercises, other sets, or the set itself). Three kinds: `weight`
  (heavier than ever), `reps` (more reps at that exact weight — bodyweight sets at 0 kg compare
  with each other only), and `e1rm` (a better Epley estimate, skipped for bodyweight); ties never
  count. `historyPRs(logs)` sweeps a whole history in one oldest-first pass per exercise, and
  `sessionPRs(sessionSets, history)` is the session recap's list — both agree with `detectPR` by
  construction, since all three share one `judge()`.
- Milestone 5 broken into Tickets 23–29 in `tickets.md`, with the two rewards decisions (the ring
  as a count, not a quota; a PR mark as permanent) written down.
- 41 new tests (244 total): the three kinds individually and combined, ties, warmup/drop/failure
  excluded on both sides, cross-exercise and cross-weight isolation, order-independence, the
  logged_at tie-break by id, e1RM-alone records, and no-mutation checks.
- Domain-only; nothing calls it yet (Ticket 24, the flash).

### Ticket 22: On-device check — milestone 4, and the README
`docs: Record the milestone 4 device check and refresh the README` · 2026-09-23

- The user ran the 25-point checklist on the iPhone — the empty state, adding and removing,
  search, dragging (including the release, which was the earlier glitch), the order holding
  across logging and an app kill, and offline — and confirmed it.
- The README had gone stale by three milestones: it now opens with what the app does today,
  marks steps 1–4 done, and lists the components, hooks, domain modules and write paths that
  exist. The seed section says 73 exercises and an empty list.

### Ticket 21 (part two): drag to reorder
`feature: Reorder your exercises by dragging them` · 2026-09-23

Built on the `drag-reorder` branch so `main` kept a working reorder throughout, then merged. The
chevrons it replaces are the commit below.

- A grip handle on each row of **Your order**: press, drag, and the other rows part to show where it
  lands. `dropIndex` (pure, 8 tests) turns the row heights and the distance dragged into a target
  index; `setListOrder` stores the result in one Dexie transaction, with an outbox row only for the
  rows that moved. Dropping a row back where it started writes nothing.
- The arrow keys still work on a focused handle, reusing `moveInList`, so nothing is lost without a
  pointer. No new dependency.
- Two bugs found and fixed while checking: the list snapped back for a frame on release (the drag
  state was cleared before the write landed), and the optimistic order that fixed it had no expiry,
  so a later keyboard move wrote correctly but never showed. A second finger on another handle could
  also drop the wrong row.
- Checked with real touch events: dragging to the top and bottom, a too-small drag writing nothing,
  one gesture writing once, dragging while the page is scrolled, a ten-row list, two drags back to
  back, and a finger on a row scrolling the page instead of reordering.

### Ticket 21 (part one): step up and step down
`feature: Reorder the exercises in a group` · 2026-09-23

- **Your order** at the top of the manage screen (`/exercises?pattern=…`), shown once a group has two
  or more picks: each row has a step up and a step down, and the one that would do nothing at either
  end is disabled rather than silently inert.
- `moveInList` in `lib/writes.ts` uses the already-tested `movePick`, then writes the group back with
  dense positions in one Dexie transaction, with an outbox row only for the rows that moved. Other
  patterns are untouched.
- `useCatalogue` also returns your list in order; the page is titled by its pattern now that it does
  more than add.
- Checked in a browser: moving both ways, walking a row to the top in two taps, the dense positions,
  the board following, **logging the last exercise leaving it last**, a reload, removal keeping the
  rest in order, and a re-added exercise going to the end.
- Superseded on the `drag-reorder` branch by a drag handle; this stays on `main` as the fallback.

### Bugfix: a finished session counts to the moment you finished it
`bugfix: Count a finished session to the moment you finished it` · 2026-09-23

- Reported from the phone as "1:40 – 1:40" on the summary. Two causes: `deriveSessions` kept only
  `endedManually: boolean` and threw the marker's timestamp away, so the end of a workout was always
  its last **set**; and a same-minute span printed the same time twice with a zero length.
- `DerivedSession.ended_at` now carries the marker (earliest wins), `summarizeSession` counts to it,
  and the summary shows one time when both ends fall in the same minute.
- The summary also counts up live while the session is running (`SessionElapsed`, its own clock, so
  only that text repaints), because it was the one page that couldn't tell you how long you'd been in.
- 9 new tests. Checked in a browser against a built hour-long workout: last set 3:00, finished 3:20,
  reads `02:00 AM – 03:20 AM · 1h 20m`; a gap-closed session still reads first set to last set.

### Tickets 19 and 20: Exercise picker, and the way into it from the board
`feature: Add the exercise picker and the board's way into it` · 2026-09-23

- `/exercises` (a static page, `?pattern=` filters to one group): the catalogue grouped by pattern
  with a search box; tapping a row adds or removes it. `useCatalogue` reads the catalogue and your
  list live, so a tapped row updates itself.
- `addToList` / `removeFromList` in `lib/writes.ts`, each one Dexie transaction over
  `template_items` and `outbox`. Adding one already listed does nothing, so a double tap can't
  duplicate it; a new pick lands at the end of its group (`nextSortOrder`).
- `PatternGroup` gains the way in: a `+` icon beside the heading for a group that has exercises, and
  the full-width "Add exercises" button for one that doesn't.
- Fixed while checking: "Show every pattern" was a plain link, so it did a full page load and left
  "‹ Board" going back to the filtered picker instead of the board. It now widens the view in place.
- Checked in headless Chrome end to end: adding, the outbox rows, sort_order 0 then 1, double-tap
  toggling, search in both scopes, the board reflecting the picks in order with their seeded
  history, and removal keeping all 376 sets. Not yet on the iPhone; that is Ticket 22.

### Tickets 17 and 18: My exercises — the catalogue, and the board as your list
`feature: Make the board show your own list of exercises, in your order` · 2026-09-23

One commit, because the two halves only work together: an empty list means nothing until the board
reads the list, and the board reading the list means nothing without a catalogue to pick from.

- **Ticket 17 — catalogue and empty list.** `CATALOGUE` in `lib/seed.ts` grows from 25 to 73 (squat
  12, hinge 11, push 13, pull 12, accessory 15, core 10); `inTemplate` is gone and the default
  template ("My Exercises") is created **empty**. `catalogueExercises()` is exported so the seed and
  the migration share one source. `lib/db.ts` gains Dexie **v2**: no schema change, just an upgrade
  that adds the catalogue exercises a device is missing, matched **by name** because ids are
  generated per seed run. Ids, history and existing list entries are untouched.
- **Ticket 18 — the board is your list.** `lib/domain/list.ts` (`ListItem`, `nextSortOrder`,
  `movePick`) holds the pure parts of the list for the write paths in Tickets 20–21. `buildBoard`
  now takes your list and follows it; `byRecency` is deleted, all six groups always come back
  (empty ones included), and an archived, missing or duplicated entry is skipped. `useBoard` reads
  the default template's items and fetches history only for listed exercises. `PatternGroup` drops
  "Show N more" and says "No exercises yet" for an empty group.
- **Milestone restructure** (the user's plan): CLAUDE.md's board UI rule rewritten, My exercises is
  milestone 4, rewards 5, sync 6; `tickets.md` rebuilt; README roadmap and layout updated.
- 20 new tests (186 total). Checked in a real browser both ways: a fresh install (73 exercises,
  empty board) and a hand-built v1 database upgrading in place with its history intact; a
  hand-written list appearing in its own order; and logging the first and second rows leaving the
  order untouched while their values updated in place.

### Ticket 15: Two-step End session — Resume or a final Finish
`feature: Make End session a two-step choice with a final Finish` · 2026-09-22

- The user asked for ending to be a real decision and for a recap of the day to follow. **End
  session** now writes nothing and opens **Resume session** / a red **Finish session**; only Finish
  writes the end marker, and it's final. The summary shows `Finished` for a session ended by hand.
- Removed `resumeSession`, `closingMarkers` and `makeMarker`, since nothing deletes a marker (172
  → 166 tests). The 90-minute rule is untouched.
- Hard Rule 2 in CLAUDE.md and the README bullet were reworded (approved with the plan). CLAUDE.md's
  build order and the README roadmap now list a recap page in milestone 4; `tickets.md` has a
  "Milestone 4 — Rewards" note and the milestone 3 tickets are renumbered (16–18).
- UI: a dimmed page behind a sheet that slides up (`motion-safe:` only), the safe button at End's
  spot, a warning red token, and animations in `theme.css`. Checked in headless Chrome at 390px.
  Not yet on the iPhone; that goes into Ticket 18.

### Ticket 14: Coverage strip — the row at the top of the board
`feature: Add pattern coverage strip to the board` · 2026-09-22

- `useCoverage` (the active session's sets plus one Dexie read of the exercises, recomputed only
  when the session or exercises change, not on each clock tick) and `CoverageStrip`, rendered by
  `Board` between the title and the groups. Tokens only.
- Shows only while a session is active; gone after End, back after Resume, and derived from the
  stored sets so a reload keeps it. No counts, no progress bar, nothing tappable.
- Checked in headless Chrome at 390px (idle, per-pattern ticks, End, Resume, reload, no overflow).
  Not yet on the iPhone; that is Ticket 17.

### Ticket 13: Coverage domain — which patterns a session has touched
`feature: Add coverage domain function for session patterns` · 2026-09-22

- `lib/domain/coverage.ts`: `coverage(sessionLogs, exercises)` returns a boolean per pattern
  (`Record<Pattern, boolean>`, so a new pattern is a compile error until handled). Every kind of
  set counts; a set with an unknown exercise is ignored; an archived exercise still counts.
- No template or target is involved, so there is nothing to fail (Hard Rules 1, 3, 6).
- 10 tests in `coverage.test.ts`. Nothing on screen yet; the strip is Ticket 14.
- The milestone 3 tickets (13–17) were added to `tickets.md`.

### Ticket 12: On-device check — run milestone 2 on the iPhone
`docs: Record the milestone 2 device check` · 2026-09-21

- No code. The user ran the 25-point checklist on the iPhone (timers across lock, app switch and
  a killed Safari; summary; End and Resume; offline; one-handed reach) and confirmed it.
- `tickets.md` marks Ticket 12 done; this file now says milestone 2 is finished.

### Ticket 11: End session — optional End button and Resume
`feature: Add optional End session button and Resume` · 2026-09-21

- `endMarkerTime` and `closingMarkers` in `lib/domain/sessions.ts` (pure, 13 tests) decide the
  marker timestamp and which markers Resume deletes; `makeMarker` test helper.
- `endSession` and `resumeSession` in `lib/writes.ts`, each one Dexie transaction over
  `sessions` and `outbox`; `outboxRow` now takes any synced table. No schema change.
- `SessionEndBar` on the summary page: pinned End session, then Session ended with Resume.
  No dialog, and nothing near the Log button.
- `useSessionSummary` scopes end markers to the session's own span (an older session was
  reading as ended once any later marker existed).
- Checked against a fake IndexedDB (one row on a double tap, End then Resume, duplicate markers,
  a future-stamped set) and headless Chrome at 390px. Not yet on the iPhone; that is Ticket 12.

### Ticket 10: Session summary page — what you did in one session, reachable from the timer
`feature: Add session summary page reachable from the session timer` · 2026-09-21

- `/session?id=…` (a static page) lists one session's sets grouped by exercise with totals and
  the time span, read from Dexie only. Read-only; delete stays on the log sheet.
- `useSessionSummary` walks outward from a set using `startsNewSession`, so the gap rule stays
  in one place and it finds the session that *contains* the set.
- The session timer is now a link to the summary; the board shows "Last session · <day> ›" when
  nothing is active (`useActiveSession` also returns `last`).
- `formatDuration` (`timers.ts`, tested), `countLabel` (`lib/format.ts`) and `BackLink`
  (extracted from `LogSheet`).
- Date labels shortened everywhere to "13 Sep" / "13 Sep 2025"; the `ordinal` helper and its
  16 tests were removed, which also changes the exercise history headings.
- Checked against a fake IndexedDB and in headless Chrome at 390px; not yet on the iPhone
  (that is Ticket 12).

### Ticket 9: Timers — session timer (time since your first set) and rest timer
`feature: Add session and rest timers derived from timestamps` · 2026-09-21

- `lib/domain/timers.ts` (`elapsed`, `formatElapsed`, 13 tests); `startsNewSession` is now
  exported from `sessions.ts` and covered by tests.
- `useActiveSession` walks the log newest-first (`orderBy('logged_at').reverse().until(...)`),
  so cost is the length of the current session; `useNow` takes an optional repaint interval.
- `SessionHeader` (small, grey, board and log sheet) and `RestTimer` (log sheet header, right
  column); the header reserves its height so the form doesn't jump when they appear.
- The walk was also checked against a fake IndexedDB (the >90-minute gap, exactly 90 minutes,
  end markers, Resume, empty log, ties). Not driven in a real browser or on the iPhone yet.

### Progress log
`docs: Add progress.md and a session-start check` · 2026-09-21

- `progress.md` summarises every earlier commit, the current state and the decisions behind them.
- CLAUDE.md's new "PROGRESS LOG" section, the plan-ticket skill and the commit skill (new
  step 2b) make it read at the start of a session and updated in each commit.

### Ticket 8: Sessions domain — gap rule, end markers, active session, session summary
`feature: Add session gap-rule domain functions with end markers` · 2026-09-21

- `lib/domain/sessions.ts`: `deriveSessions` and `assignSession` split sets at gaps over
  90 minutes (exactly 90 stays together) or at an end marker; `activeSession`; and
  `summarizeSession`, which groups a session's sets by exercise in first-performed order.
- `sessions.test.ts` covers the boundary, markers, ordering, ties and missing exercises.
- Hard Rule 2 reworded for the optional End button, Rule 1 notes the end marker, milestone
  marker moved to 2, and the session route is now `/session?id=…`.
- Milestone 2 ticket breakdown added to `tickets.md`.

### Ticket 6: Exercise history — every set, grouped by day
`feature: Group exercise history by day with weekday and date labels` · 2026-09-21

- The log sheet's "Recent sets" (last 5) became "History": every set of the exercise, one
  card per day, newest first, with Today / Yesterday / weekday / date headings.
- `lib/domain/history.ts` (`groupByDay`, `dayLabel`, `ordinal`; `ordinal` was later dropped in
  Ticket 10) over local calendar days, 33 tests run in five timezones. `RecentSets.tsx` became `SetHistory.tsx`.

### Ticket 5: Dark theme — the whole app dark, no light mode
`feature: Switch the app to a dark-only theme` · 2026-09-21

- `theme.css` got dark values for every token, same names; `color-scheme: dark` in CSS and
  the Next viewport. Every text/background pair is at least 4.5:1.

### Ticket 4: Log sheet — ghost values, one-tap repeat, ± buttons, Dexie-then-outbox writes
`feature: Add log sheet with one-tap set logging and outbox writes` · 2026-09-21

- `/exercise?id=…` with ghost values, ± buttons, tap-to-type, kind chips and a pinned Log
  button; `lib/writes.ts` (`logSet`, `deleteSet`) in one Dexie transaction with an outbox row.
- `lib/domain/entry.ts` (stepping, parsing, prefill; 41 tests), `useLogSheet`, and `useNow`
  extracted from `useBoard`. Board rows link to the sheet.

### Ticket 3: Board — pattern groups, staleness sort, last weight inline
`feature: Add board with pattern groups, last-set inline and Wise theme` · 2026-09-21

- Board at `/` with `lib/domain/board.ts` (`buildBoard`, 13 tests) and `useBoard`, which
  reads two indexed rows per exercise so cost stays flat as history grows.
- `DESIGN.md` and `app/theme.css` (Wise-inspired tokens; Tailwind's default palette cleared);
  `check-rules.sh` now fails on raw colors outside `theme.css`.
- `next.config.ts` allows VS Code tunnel origins in dev for phone testing.

### Planning workflow
`docs: Add plan-ticket skill and ticket list` · 2026-09-21

- `plan-ticket` skill (orient, name "Ticket N: main feature", write the plan, hand over;
  built but not committed until asked) and `tickets.md`.

### Ticket 2: Domain layer — previous-set prefill and staleness
`feature: Add previous-set and staleness domain functions` · 2026-09-21

- `previousSet` (last working set; ignores warmup, drop, failure) and `staleness` (days
  since any set; null if never performed), both pure and order-independent.
- `test-utils.ts` (`makeSet`), 28 tests including a realism check against the seed.

### Project README
`docs: Add project README` · 2026-09-21

- What the app is, stack, layout, layered architecture, setup, seed data, data model and
  the five-step roadmap.

### Ticket 1: Data foundation — Dexie schema, types, seed
`feature: Add Dexie schema, seed data and commit skill` · 2026-09-21

- `lib/domain/types.ts`, `lib/db.ts` (Dexie v1, the `[exercise_id+logged_at]` index, seeded
  on first creation, dev-only `resetAndSeed`), `lib/seed.ts` (25 exercises, a default
  template, ~6 weeks / 16 sessions), `lib/uuid.ts`, `lib/constants.ts`.
- The commit skill and `check-rules.sh`, a grep for CLAUDE.md hard-rule violations.

### Scaffold
`Scaffold frontend (Next.js) and backend (Supabase) projects` · 2026-09-20

- `frontend/` from create-next-app (App Router, TypeScript, Tailwind 4, ESLint, pnpm);
  `backend/` from `supabase init` (config only, no custom server); `CLAUDE.md`.

## How this file is kept

- **Before each commit**, add a Log entry at the top (ticket label, commit subject, date,
  a few bullets) and refresh "Where we are", "What works today" and "Decisions worth
  remembering" if the commit changed them. Stage it with the rest so it lands in the same
  commit and the tree stays clean.
- **At the start of a session,** read this file first.
- Keep it a summary, not a copy of `git log`: the *why* and the current state, not every
  file touched.
