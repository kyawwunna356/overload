# Progress

What has been built in this app and what's next, so a new session can pick up without
re-reading the whole repo. **Read this file at the start of every session**, then
`CLAUDE.md` (rules and current milestone) and `.claude/skills/plan-ticket/tickets.md`
(ticket statuses). It is updated in the same commit as each piece of work — see
[How this file is kept](#how-this-file-is-kept).

## Where we are

- **Milestone 4 — My exercises is finished** (Tickets 17–22) and was checked on the iPhone, as
  milestones 1–3 were. Milestone 5 (rewards) is broken down into Tickets 23–32 in `tickets.md`;
  23–31 (the PR domain, flash, history marks, week calendar, mastery levels, the recap, swipe
  to delete, the one-list picker and the finish moment) are built.
- **Last commit:** `feature: Celebrate Finish with a confetti burst and a rolling total` (this
  one, Ticket 33 — tried on a `confetti` branch, kept, merged into main).
- **Next: the milestone 5 device check** (Ticket 32). Milestone 6 is sync and install (Supabase,
  outbox flush, PWA install, `navigator.storage.persist()`).
- **Tests:** 312 Vitest tests, domain layer only.

## What works today

- **Board** (`/`): six movement-pattern groups, each holding **the exercises you picked, in the
  order you put them in** — never re-sorted by what you did last, and logging never moves a row.
  A group you haven't picked for says "No exercises yet." Every row shows its name in white,
  then — small and faint (`text-mute`) — the last working set (`82.5 kg × 5`, `BW × 9`) and days ago
  (`2d`, never "today"), and a `›` so it reads as a link. A lift never done shows just its name. Nothing is folded away: you chose the list.
- **The catalogue and manage screen** (`/exercises`, or `?pattern=…` for one group, titled by that
  pattern and nothing else): 73 exercises across the six patterns, with a search box. Each pattern
  is **one list**: your picks first, in your order, each with `On board ✓` and a grip handle you drag
  to reorder (the board follows); then the rest of the catalogue as neutral `Add` rows. Tapping Add
  slides the row up to the end of your picks with a brief green glow; tapping a pick slides it back
  to its catalogue place — one tap, no save button, and removing keeps every set you ever logged.
  Only a handle starts a drag, so the list still scrolls under a finger; the arrow keys on a focused
  handle reorder without a pointer. Handles hide while searching. A group on the board reaches it by the `+` beside its heading,
  or by the full-width "Add exercises" button when the group is still empty.
- **Log sheet** (`/exercise?id=…`): last working set as large ghost values, ± buttons
  (2.5 kg, ±1 rep, drawn signs centred in round buttons), tap a number to type (the field empties with the value as a faint placeholder — no selection, no focus box; leave it empty and nothing changes), and a "Log set" button pinned to the bottom.
  There is no set-type picker: every set logged is `working` (`kind` stays in the data; see Decisions). One tap repeats the
  last set. Below it, the full history grouped by day (Today, Yesterday, weekday, then short
  dates like "13 Sep"); each row's time is small and grey on the right. Swipe a set left to delete it: past halfway or a flick deletes, less
  springs back, and scrolling never deletes; a Delete button appears only on keyboard/VoiceOver
  focus. The header reads `Squat · Level 3`; tapping the dotted
  "Level 3" shows a small label, `6 sessions · 4 to Level 4`, and a tap anywhere hides it.
- **Coverage strip** (top of the board, only while a session is active): six pills, one per
  pattern, under the title. A pattern the session has touched is tinted with a ✓ (`Squat ✓`); the
  rest are just the name in grey. Not tappable, no counts, nothing to fail. It disappears when the
  session ends (the idle gap, or Finish).
- **Session summary** (`/session?id=…`): one session's sets grouped by exercise (in the order
  first performed), with totals and the time span. The span runs from the first set to **the end of
  the session** — the moment you tapped Finish, or the last set when the gap closed it — so the
  length is the whole workout. While the session is still running the page counts up live
  (`Today 6:20 PM · 42:10`) instead of showing a frozen length. Read-only apart from the bottom bar below.
  Tapping the session timer opens it; when no session is active, the board shows
  "Last session · <day> ›" instead, linking to the most recent one. Under the header, a **week
  strip**: the session's week, Monday to Sunday, with trained days (any set) filled green; the
  session's own day is a green outline while it's still going and fills in once it's over. Days off are plain grey; no count, no target. Once the
  session is over (Finish, or the 90-minute gap), a **recap card** sits above the strip: the total
  weight lifted (`8,508 kg`, every set, warmups included), then **Records · 5** and **Levels · 2**
  as folded rows you tap to open. Empty parts are left out. Level-ups show the exercise and a
  gold badge with a double up-arrow and the level.
- **The finish moment** (only right after tapping Finish): the page dims and a deck of cards pops
  up — a dark "Workout done" card with the total and counts in bold lime, then Records (3 per card)
  and Levels (5 per card), spread over more cards when long. Swipe between them (CSS scroll-snap)
  or tap the dots; Done, the dimmed page or Escape closes it and returns to the top. As it opens,
  confetti bursts from the bottom corners (lime, yellow, off-white; gone in ~2 s, never blocks a
  tap) and the total rolls up from 0 in 0.9 s. Reduced motion: no confetti, the total just shows. Never shown
  for a gap-closed session or a revisit, and nothing about it is stored.
- **End session** (a bar pinned to the bottom of the summary, only for the active session):
  **End session** writes nothing; it opens a sheet over a dimmed page: **End this session?**, a
  red **Finish session** and, below it, **Resume session**. Resume (or tapping the dimmed page)
  just goes back. Finish writes the end marker and is final: both timers disappear, the bar goes, and
  nothing offers to undo it. The next set opens a new session. A session the 90-minute gap closed
  looks the same, so forgetting to end still works.
- **Timers** (only while a session is active, i.e. a set in the last 90 minutes): a small
  grey `Session 42:10` (time since the session's first set, a link to the summary) in the
  board header only, and a `Rest` timer (time since the last set, any exercise, counts up) at the
  top right of the log sheet — the only counter there. There's no start button: your first set opens the session.
- **PR flash** (log sheet): logging a working set that breaks a weight, rep-at-that-weight, or
  e1RM record drops a dark-yellow "New record" card in at the top of the screen and dims the page.
  One line per kind broken, `85 kg → 87.5 kg`: the old value small and grey, the new one large in
  yellow (`record` / `record-pale` tokens). It closes itself after 4 seconds or on a tap anywhere
  (a tap while it's up only closes it); nothing about it is stored.
- **PR pills** (log sheet history): every set that broke a record carries a small green `PR` pill,
  for good — beating it later doesn't take it away. Derived with `historyPRs` on each read, so it
  always agrees with the flash; a screen reader hears which records it broke.
- **Local data:** Dexie database seeded once with 25 exercises, a default "Full Body"
  template and ~6 weeks of training. Every write is one Dexie transaction over `set_logs`
  and `outbox`. Nothing syncs yet.
- **Domain layer** (`frontend/lib/domain/`, pure and tested): `previous`, `staleness`,
  `board`, `list`, `entry`, `history`, `sessions`, `timers`, `coverage`, `prs`, `week`, `mastery`, `recap`, `swipe`. `useCoverage` combines the active
  session's sets with the exercise list for the strip. `useActiveSession` (in `lib/hooks/`)
  reads the current session from Dexie through `sessions.ts` and also returns `last` (the
  most recent session); the summary page uses `useSessionSummary`; `timers.ts` also has
  `formatDuration`. `writes.ts` has `logSet`, `deleteSet` and `endSession` (run by Finish), each
  one Dexie transaction with an outbox row; `sessions.ts` has `endMarkerTime` behind the last.
- **Look:** dark only; every color, font and radius is a token in `app/theme.css`. No text
  selection or long-press callout (inputs excepted) and no visible scrollbars, app-wide.

**Not built yet:** Supabase sync, PWA install, and the history page.

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
- **Celebration tricks are visual only.** Confetti is a hand-rolled canvas (`Confetti.tsx`, colours
  read from the theme's CSS variables), no dependency. Haptics were ruled out (iOS web has no
  vibration API) and so was sound (headphones in, and Safari blocks audio without a tap).
  `useCountUp` is a display animation driven by `requestAnimationFrame`, not a timer.
- **The session timer lives on the board only.** The log sheet shows just the rest timer; the way
  into the summary (and End) is the board's timer.
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
- **The board's idle link shows only the most recent session.** A list of sessions is the
  later history page.
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
- **End lives only on the summary page** (two taps from the board via the session timer), never
  beside the pinned Log button where a mis-tap would hurt.
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

## Log

Newest first. One entry per commit, matching `git log`; hashes are left out because an
entry is written in the same commit it describes.

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
