# Ticket list

Kept current by the plan-ticket skill. Statuses: `next`, `not started`,
`built — awaiting review` (code is in the working tree, uncommitted), and `done`
(committed). When a new milestone starts, add its tickets here as part of planning the
first one. The milestone order itself comes from the build order in CLAUDE.md.

## Milestone 1 — Data and logging

| # | Ticket | Status |
|---|---|---|
| 1 | Data foundation — Dexie schema, types, seed | done |
| 2 | Domain layer — previous-set prefill and staleness | done |
| 3 | Board — pattern groups, staleness sort, last weight inline (plus the Wise theme in `theme.css`) | done |
| 4 | Log sheet — ghost values, one-tap repeat, ± buttons, Dexie-then-outbox writes | done |
| 5 | Dark theme — the whole app dark, no light mode | done |
| 6 | Exercise history — every set, grouped by day with weekday/date labels | done |
| 7 | On-device check — run milestone 1 on the iPhone | done |

## Milestone 2 — Sessions and timers

| # | Ticket | Status |
|---|---|---|
| 8 | Sessions domain — gap rule, end markers, active session, session summary | done |
| 9 | Timers — session timer (time since your first set) and rest timer | done |
| 10 | Session summary page — what you did in one session, reachable from the timer | done |
| 11 | End session — optional End button and Resume | done |
| 12 | On-device check — run milestone 2 on the iPhone | done |

## Milestone 3 — Patterns and coverage

| # | Ticket | Status |
|---|---|---|
| 13 | Coverage domain — which patterns a session has touched (pure, tested) | done |
| 14 | Coverage strip — the row at the top of the board while a session is active | done |
| 15 | Two-step End session — Resume or a final Finish (a fix to Ticket 11's ending flow) | done |
| 16 | On-device check — run milestone 3 on the iPhone | done |

Template-as-view was dropped from this milestone: milestone 4 replaces it with a list you pick and order
yourself, which is the same ground done properly. The two tickets planned for it were never built.

## Milestone 4 — My exercises

Pick your list from the catalogue, order it yourself, and the board shows that list in that order. Logging
never reorders anything. See CLAUDE.md's UI rule for the board and Hard Rule 3.

| # | Ticket | Status |
|---|---|---|
| 17 | Catalogue and empty list — 73 exercises seeded, nothing picked, Dexie v2 migration | done |
| 18 | Picks domain — the board is your list in your order (pure, tested) | done |
| 19 | Add exercises from the board — an Add link in every group | done (built with Ticket 20) |
| 20 | Exercise picker — browse the catalogue, add and remove | done |
| 21 | Reorder — drag a row by its handle to move it | done |
| 22 | On-device check — run milestone 4 on the iPhone | done |

## Milestone 5 — Rewards

The payoff layer, all of it derived from `set_logs` — no schema change and no Dexie version bump in the
whole milestone. Two decisions shaped it (the user's): the week is shown with **no target** — the weekly
ring was dropped for a plain calendar of the days you trained, because an empty arc against a number is
loss aversion however kind the words are; and a record is **marked permanently** in the history, not only
flashed, which a set's record status allows because it is only ever judged against sets earlier than itself.

| # | Ticket | Status |
|---|---|---|
| 23 | PR domain — weight, reps and e1RM records (pure, tested) | done |
| 24 | PR flash — the reward the moment you log a record | done |
| 25 | PR marks — a durable `PR` pill in the exercise's history | done |
| 26 | Week calendar — the days you trained this week, on the session summary | done |
| 27 | Mastery levels — how long you've been doing a lift | done |
| 28 | Session recap — what the workout was worth, on the summary once it's over | done |
| 29 | Swipe to delete — swipe a set left in the history to delete it | done |
| 30 | One list — pick and order your exercises in the same list | done |
| 31 | The finish moment — swipeable recap cards when you tap Finish | done |
| 32 | On-device check — run milestone 5 on the iPhone | done |
| 33 | Celebrate the finish — confetti burst and a rolling total | done |
| 34 | Muscle balance — a six-point star of what the session leaned on | done |

## Milestone 6 — Sync and install

Supabase becomes the durable copy, and the app becomes an installed PWA that opens offline. The
user's decisions:
- **Hosting:** Vercel, as a static export.
- **Sign-in:** an email plus a 6-digit code, not a magic link, since iOS opens links in Safari
  rather than the home-screen app.
- **Seed data:** the fake seeded sets are dropped before the first backup.
- **History must stay forward compatible:** schema changes are additive only, new fields get a
  default on read, an unknown value never drops a row, and a frozen fixture of today's data is
  tested forever.

**Why sync comes before install.** The installed app lives at a new origin (Vercel) with its own
storage, so it opens empty. Your real history can only cross over by pushing it from today's app
and pulling it into the installed one.

**Two limits, accepted.** Deletes don't travel between two devices that are both in use, because
there are no tombstones. A fresh device's untouched catalogue is replaced by the remote one on
restore, so no exercise is duplicated.

**Later, for friends (the user's plan):** friends sign in by typing their email. The code already
supports it. What's missing is an email sender that reaches anyone, since Supabase's built-in one
only delivers to the project's team. Connect custom SMTP (Resend plus a domain) in the dashboard;
no code change is needed. Until then the email code is for the user only. Google sign-in is built
but its dashboard setup is deferred too.

| # | Ticket | Status |
|---|---|---|
| 35 | Sync foundation — Supabase schema, RLS, and a local store ready to back up (fake sets dropped, forward-compatibility contract, every row queued) | done |
| 36 | Back up — sign in with Google or an email code, and push the outbox (on `online` and on returning to the app) | done |
| 37 | Restore — pull from Supabase into a fresh device (last write wins on `updated_at`, `synced_at` cursor; plus a repair that merges duplicated catalogues and lists) | done |
| 38 | Install — static export on Vercel, manifest, icons, service worker, `storage.persist()` | done |
| 39 | On-device check — run milestone 6 on the iPhone, moving to the installed app without losing a set | done |

## Milestone 7 — Shell and live session

The redesign starts here (the user's plan, `Overload — UX flow plan.md`, and the Figma file *Overload —
UI/UX redesign*). The features stay the same, and so do the Hard Rules: no schema change and no Dexie
version bump in milestones 7–10. Navigation becomes three tabs (Train, History, Me) plus a live session
bar that exists only after your first set. End moves off the summary and onto the live screen. The
user's decisions:
- **Four milestones, each ending in an iPhone check**, not the design doc's single milestone. The doc's
  ticket numbers shift because of this.
- **Me keeps the `/account` URL.** Supabase's Redirect URL and the service worker's cached page both
  point there.
- **Sheets are query params on the current page** (`?log=`, `?live`, `?edit=`), opened with
  `history.pushState`. Back, swipe-down and a tap on the dimmed strip close them. A reload reopens
  them offline, because the worker ignores the query. `/exercise` and `/exercises` stay for old links.
- **The rest time counts up with no ring.** A ring against `default_rest_sec` would add a target, which
  the weekly-ring decision already turned down.

| # | Ticket | Status |
|---|---|---|
| 40 | Redesign rules — CLAUDE.md, build order 7–10, and this list (docs only) | done |
| 41 | Tab bar and Me tab — Train, History, Me; backup and sign-in leave the board; a badge only for "Backup paused" | done |
| 42 | Sheet host — a shared `Sheet` (grab handle, swipe down, Escape), `?log=` over any page with `pushState`, the log sheet over the board, and the `raised` token | done |
| 43 | Live session bar and live screen — rest and session time after the first set, the session clock, coverage chips, exercises in the order done, End → Finish/Resume → deck → summary | done |
| 44 | On-device check — run milestone 7 on the iPhone | next |

What each ticket builds from:
- **41:**
  - `TabBar` is three `Link`s in `(app)/layout.tsx`, with the active tab from `usePathname`.
  - Me (`/account`) is rebuilt from `AccountForm` into signed out, backed up and paused (Figma
    6.1–6.3), using `backupState` and `useBackupStatus`. It adds a local stats line and the version.
  - `BackupLine` is removed.
  - A placeholder `(app)/history/page.tsx` is added.
- **42:**
  - `Sheet.tsx` reuses `gestureAxis` from `lib/domain/swipe.ts` for swipe-down.
  - `SheetHost.tsx` in the layout reads `?log=`.
  - `LogSheet` splits into `LogSheetBody` plus two wrappers: the sheet, and the `/exercise?id=` page.
  - Board rows open the sheet in place, so the board's scroll position never moves.
- **43:**
  - `LiveBar.tsx` shows when `useActiveSession().session` is non-null, and hides while the log sheet
    is open (one prominent counter).
  - `LiveSession.tsx` opens as `?live` and uses `useCoverage` and `useSessionSummary`.
  - `SessionEndBar`'s choice moves here, keeping Resume where End was. `RecapMoment`'s Done goes to
    `/session?id=`.
  - The summary loses its End bar, and the board's `SessionHeader` goes.

## Milestone 8 — Log sheet as a set table

The log sheet answers "what did I do last time, set by set": today's sets are numbered, with the same
set from last session beside each (Hevy's PREVIOUS column). Prefill runs from last time's set N, then
your last set today, then your last working set ever. **"Last time" follows the gap rule on the
exercise's own sets** (the user's choice), not the calendar day, so two sessions on one day stay apart.
Rewards never block a tap.

| # | Ticket | Status |
|---|---|---|
| 45 | Set table — `previousSession` (domain), Last time beside Today, per-set prefill, and Earlier folded | done |
| 46 | Edit and undo — tap a today row to edit it (`updateSet`), and Undo for 5 s after a delete (`restoreSet`) | not started |
| 47 | Next up — the next lift on your board not done this session, swapped in place | done |
| 48 | Record banner — slides in under the header for 3 s, no dimming, catches no taps (replaces `PRFlash`) | done |
| 49 | On-device check — run milestone 8 on the iPhone | not started |

What each ticket builds from:
- **45:**
  - `previousSession(exerciseId, logs, before, gapMinutes)` in `previous.ts` groups that exercise's
    sets with `startsNewSession`.
  - `prefillFor(setNumber, lastTime, today, previous)` goes in `entry.ts`.
  - `useLogSheet` also returns `today` and `lastTime`.
  - `SetTable.tsx` is added. The level becomes plain text (`Push · Level 5 · 14 sessions`), and
    `LevelBadge`'s tap label is retired.
- **46:** Both writes are one Dexie transaction plus an outbox upsert. `restoreSet` keeps the set's
  original id. `Snackbar.tsx` never catches taps outside itself.
- **47:** `nextUp(boardOrder, doneToday, currentId)` goes in `board.ts`, for display only (Hard
  Rule 3). The sheet's `?log=` changes with `replaceState`, so back still returns to the board.
- **48:** `RecordBanner.tsx` reads `New record · 85 kg × 5 (was 82.5)` and is announced through
  `aria-live`. It still uses `detectPR` on the history held before the tap.

## Milestone 9 — Board, picker and summary

The board answers "what have I done today" and "how's my week" with no extra tap. It's still your list
in your order, and logging never moves a row. The picker is a sheet with a real Done. The summary is
read-only and opens with the rewards. The user's decisions:
- **The week strip goes on the board, and at the bottom of the summary.**
- **The muscle star keeps the six muscle groups** (Chest, Shoulders, Arms, Core, Legs, Back), not the
  pattern names drawn in the Figma frame.

| # | Ticket | Status |
|---|---|---|
| 50 | Board — date header and Edit, the week strip on top, a ✓ on pattern headings (the coverage strip retired), two row states with the level, and empty groups hidden | not started |
| 51 | Picker as a sheet — `?edit=<pattern>`, Done, pattern chips with pick counts, the chip pre-selected from a group's `+` | not started |
| 52 | Summary and finish deck — a Duration · Sets · kg stat row, rewards open, the week strip at the bottom, and Done landing on the summary | not started |
| 53 | On-device check — run milestone 9 on the iPhone | not started |

What each ticket builds from:
- **50:**
  - `rowState(exerciseId, sessionSets, history, now)` goes in `board.ts`, giving `Last: … · 4d` or
    `Today: 3 sets · best …` or `New`. `useBoard` already reads each listed exercise's history.
  - Line 2 is in `text-body`.
  - The week strip comes from `useWeek(now)`, and the heading ticks from `useCoverage`.
- **51:** `ExercisePicker`'s one list, drag, `useFlip` and 400 ms guard are unchanged. `/exercises`
  stays as a wrapper for old links.
- **52:** `sessionStats(summary)` goes in `recap.ts`. Rewards fold only past 5 items, and the block is
  left out when empty.

## Milestone 10 — History and first run

History answers two questions, "what did I do on Thursday" and "what did I bench five weeks ago", with
no charts in either view. First run gives value first and asks for an account later: the only new
stored things are two localStorage UI flags. The milestone ends with release 2.0.0.

| # | Ticket | Status |
|---|---|---|
| 54 | History: Sessions — grouped by week with trained-day dots, and cards with duration, counts, patterns and records | not started |
| 55 | History: Exercises and exercise detail — A to Z with search; a records card, every session, Log a set, and editing a past set | not started |
| 56 | First run — a derived welcome, a first-set hint, a Safari install card (7-day dismiss), and a backup prompt after the first finished session | not started |
| 57 | Custom exercise — "Can't find it?" in the picker adds your own lift to a pattern | not started |
| 58 | On-device check and release 2.0.0 | not started |

What each ticket builds from:
- **54:**
  - `sessionWeeks` and `sessionCard` go in `history.ts`, reusing `weekRange`, `weekOf` and
    `sessionPRs`.
  - `useHistory` reads 8 weeks at a time by `logged_at` and derives them with `deriveSessions`.
- **55:**
  - `exerciseRecords` and `exerciseIndex` go in `prs.ts`.
  - The static `(app)/history/exercise/page.tsx?id=` is added.
  - Edits reuse Ticket 46's writes, and the session recomputes because it's derived.
- **56:**
  - The welcome and the hint are derived (no picks and no sets), with no flag.
  - `showInstallCard(dismissedAt, now, standalone)` is pure.
  - Two flags: `overload.installDismissed` and `overload.backupPromptDismissed`.
- **57:**
  - `addCustomExercise(name, pattern)` is one transaction (an `exercises` row plus an outbox
    upsert), then `addToList`.
  - There's no schema change. `muscleOf` already falls back to the pattern, and `repairDuplicates`
    merges by name.
- **58:** Bump `package.json` to 2.0.0, update CHANGELOG and README, and tag `v2.0.0` (when asked).

Left out of milestones 7–10: bodyweight `BW +` entry, per-exercise rest targets, bringing back the
set-type chips, and auto-scroll while dragging.
