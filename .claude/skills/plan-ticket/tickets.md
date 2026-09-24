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

| # | Ticket | Status |
|---|---|---|
| 35 | Sync foundation — Supabase schema, RLS, and a local store ready to back up (fake sets dropped, forward-compatibility contract, every row queued) | done |
| 36 | Back up — sign in with an email code and push the outbox (on `online` and on returning to the app) | next |
| 37 | Restore — pull from Supabase into a fresh device (last write wins on `updated_at`, `synced_at` cursor) | not started |
| 38 | Install — static export on Vercel, manifest, icons, service worker, `storage.persist()` | not started |
| 39 | On-device check — run milestone 6 on the iPhone, moving to the installed app without losing a set | not started |
