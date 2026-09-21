# Progress

What has been built in this app and what's next, so a new session can pick up without
re-reading the whole repo. **Read this file at the start of every session**, then
`CLAUDE.md` (rules and current milestone) and `.claude/skills/plan-ticket/tickets.md`
(ticket statuses). It is updated in the same commit as each piece of work — see
[How this file is kept](#how-this-file-is-kept).

## Where we are

- **Milestone 3 — Patterns and coverage** is in progress (Tickets 13–18). Milestone 2 is finished
  and was checked on the iPhone, like milestone 1. CLAUDE.md's "Current milestone" still says 2;
  bumping it is the user's to do. The board already groups by pattern and sorts by recency, so
  milestone 3 adds the coverage strip and template-as-view.
- **Last commit:** Ticket 15: Two-step End session — Resume or a final Finish (a fix to
  Ticket 11's ending flow, asked for by the user).
- **Next:** Ticket 16: Template-as-view domain (the board's visible picks come from a template).
  Then Ticket 17: Board uses the template, and Ticket 18: On-device check for milestone 3.
  **Milestone 4 must also include a session recap page** (`/recap?id=…`, opened by Finish): PRs
  hit in the session and the total weight lifted, plus the weekly ring and mastery level-ups.
  It's recorded in `tickets.md`, the README roadmap and CLAUDE.md's build order.
- **Tests:** 166 Vitest tests, domain layer only.

## What works today

- **Board** (`/`): six movement-pattern groups, each sorted most recently performed first
  (never-performed last), collapsed to the top 3 with "Show N more". Every row shows the
  last working set inline (`82.5 kg × 5`, `BW × 9`) and days ago.
- **Log sheet** (`/exercise?id=…`): last working set as large ghost values, ± buttons
  (2.5 kg, ±1 rep), tap a number to type, kind chips (warmup / working / drop / failure)
  that reset to Working, and a "Log set" button pinned to the bottom. One tap repeats the
  last set. Below it, the full history grouped by day (Today, Yesterday, weekday, then short
  dates like "13 Sep") with delete.
- **Coverage strip** (top of the board, only while a session is active): six pills, one per
  pattern, under the title. A pattern the session has touched is tinted with a ✓ (`Squat ✓`); the
  rest are just the name in grey. Not tappable, no counts, nothing to fail. It disappears when the
  session ends (the idle gap, or Finish).
- **Session summary** (`/session?id=…`): one session's sets grouped by exercise (in the order
  first performed) with totals and the time span. Read-only apart from the bottom bar below.
  Tapping the session timer opens it; when no session is active, the board shows
  "Last session · <day> ›" instead, linking to the most recent one.
- **End session** (a bar pinned to the bottom of the summary, only for the active session):
  **End session** writes nothing; it opens a sheet over a dimmed page: **End this session?**, a
  red **Finish session** and, below it, **Resume session**. Resume (or tapping the dimmed page)
  just goes back. Finish writes the end marker and is final: both timers disappear, the summary
  shows `Finished · Your next set starts a new session.` with no bar, and nothing offers to undo
  it. The next set opens a new session. A session the 90-minute gap closed shows no bar and no
  `Finished` line, so forgetting to end still works.
- **Timers** (only while a session is active, i.e. a set in the last 90 minutes): a small
  grey `Session 42:10` (time since the session's first set, a link to the summary) in the
  board header and on the log sheet, and a `Rest` timer (time since the last set, any
  exercise, counts up) at the top right of the log sheet. There's no start button: your first set opens the session.
- **Local data:** Dexie database seeded once with 25 exercises, a default "Full Body"
  template and ~6 weeks of training. Every write is one Dexie transaction over `set_logs`
  and `outbox`. Nothing syncs yet.
- **Domain layer** (`frontend/lib/domain/`, pure and tested): `previous`, `staleness`,
  `board`, `entry`, `history`, `sessions`, `timers`, `coverage`. `useCoverage` combines the active
  session's sets with the exercise list for the strip. `useActiveSession` (in `lib/hooks/`)
  reads the current session from Dexie through `sessions.ts` and also returns `last` (the
  most recent session); the summary page uses `useSessionSummary`; `timers.ts` also has
  `formatDuration`. `writes.ts` has `logSet`, `deleteSet` and `endSession` (run by Finish), each
  one Dexie transaction with an outbox row; `sessions.ts` has `endMarkerTime` behind the last.
- **Look:** dark only; every color, font and radius is a token in `app/theme.css`.

**Not built yet:** template-as-view, the session recap page,
PRs, weekly ring, mastery, Supabase sync, PWA install, manage and history pages.

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
- **Coverage counts any kind of set** (warmups included, like `staleness`), takes no template, and
  is never a target. It shows only while a session is active, so a row of untouched patterns
  never reads as failure. Untouched pills carry no dash or mark, by the user's choice: the ✓ and
  the tint are the only signal. Six pills including Core wrap to two rows at phone width.
- Tickets 7 and 12 (the on-device checks for milestones 1 and 2) have no code commit: the user
  confirmed them by hand on the iPhone.

## Log

Newest first. One entry per commit, matching `git log`; hashes are left out because an
entry is written in the same commit it describes.

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
