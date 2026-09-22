# Overload

A personal strength log. It does three things:

1. Shows what you lifted last time.
2. Lets you record today's set in under three seconds.
3. Never makes you set anything up.

It's a single-user app, installed as a PWA on an iPhone and used in a gym basement with
no signal. Everything works offline; the network is only ever a background backup.

> **Status: early development.** The data layer (Dexie schema, seed data, the first
> domain functions), the board — the home screen showing your exercises by movement
> pattern with the last set inline — and the log sheet, where one tap records a set, are
> in place. Sessions and timers are next. See [Roadmap](#roadmap).

## How it thinks

The app is built around a few decisions that shape every feature. They're spelled out in
full in [CLAUDE.md](CLAUDE.md); the short version:

- **A set is the only thing that exists.** Sessions, timers, PRs, streaks, coverage and
  "previous weight" are all *derived* from the log of sets, never stored on their own.
- **No "Start Workout".** A session is just a run of sets with no gap longer than 90
  minutes. The first set opens one; an idle gap closes it. An optional "End session" button
  can close it sooner: it asks whether to resume or finish, and finishing is final. Nothing
  ever has to be ended or cleaned up.
- **Templates are a view, not a rule.** Your list decides which exercises appear on the
  board and in what order — you pick them from the catalogue and order them yourself. It
  never limits what you can log, and there's nothing to "skip".
- **Timers are timestamp arithmetic.** Session time is `now − first set`; rest time is
  `now − last set` and counts up with no target. They survive the phone locking or the
  app being killed because the truth is a timestamp in the database.
- **Local first.** Every read comes from the on-device database and every write goes
  there first. The UI never waits on the network.
- **Coverage, not completion.** The home screen shows which movement patterns you've hit
  (`Squat ✓ Hinge ✓ Push ✓ Pull — …`), never "5/8 done". Streaks are weekly, not daily.

### Not planned

Charts and analytics, workout programs or AI-generated workouts, social features,
nutrition or bodyweight tracking, push notifications, and native app wrappers.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, client-heavy — no SSR on the logging path |
| Language | TypeScript (strict) |
| Local store | Dexie over IndexedDB, with `useLiveQuery` for reactivity |
| Remote | Supabase Postgres with row-level security — no custom backend server |
| Sync | Hand-rolled outbox, last-write-wins on `updated_at` |
| IDs | Client-generated UUIDv7 |
| Styling | Tailwind CSS 4 |
| Tests | Vitest, domain layer only |

## Repository layout

```
frontend/                 Next.js app
  DESIGN.md               the design system (Wise-inspired) the UI follows
  app/
    theme.css             every color, font and radius — the one place to change the look
    (app)/                the app's screens: the board at /, the log sheet at /exercise?id=…,
                          the session summary at /session?id=…, the catalogue at /exercises
  components/             Board, PatternGroup, ExerciseRow, LogSheet, SetEntry, SetHistory,
                          SessionSummary, SessionHeader, RestTimer, SessionEndBar, BackLink
  lib/
    db.ts                 Dexie schema, seeding, dev reset
    writes.ts             the write path: logSet / deleteSet / endSession,
                          each one Dexie + outbox transaction
    seed.ts               the exercise catalogue plus ~6 weeks of realistic training data
    format.ts             display helpers (weights, "days ago", times)
    uuid.ts               UUIDv7 ids
    constants.ts          local user id
    hooks/                useBoard, useLogSheet, useActiveSession, useSessionSummary, useNow —
                          read Dexie live for the UI
    domain/               pure functions over plain data — no db, sync, react or next
      types.ts            row types shared by everything
      previous.ts         last working set of an exercise (prefill)
      staleness.ts        days since an exercise was last performed
      board.ts            groups and sorts exercises for the home screen
      entry.ts            stepping and parsing for the log sheet's weight and reps
      history.ts          groups an exercise's sets by day (Today, Yesterday, weekday, date)
      sessions.ts         the gap rule: derives sessions, the active one, a session summary,
                          and the end-marker time used when a session is finished
      timers.ts           elapsed time for the session and rest timers, and duration labels
backend/
  supabase/               Supabase project config (migrations arrive with sync)
.claude/skills/commit/    the commit workflow and hard-rule checker used in this repo
CLAUDE.md                 architecture, hard rules and build order
```

The architecture is layered so the logic stays testable:

```
UI (app/, components/)     never imports lib/sync or @supabase
  ↓
Domain (lib/domain/)       pure functions, no I/O, fully tested
  ↓
Local store (lib/db.ts)    Dexie — the single read path for the UI
  ↓
Sync (lib/sync/)           flushes the outbox on `online` and on foreground
  ↓
Supabase Postgres          durable archive only
```

`lib/sync/` and the remaining `lib/domain/` modules (PRs, coverage) don't exist yet;
`lib/domain/sessions.ts` (the gap rule) and `lib/domain/timers.ts` do.

## Design

The look follows [frontend/DESIGN.md](frontend/DESIGN.md), a Wise-inspired design system
installed with `npx getdesign@latest add wise`. The app is **dark only**: a near-black page,
slightly lighter rounded cards, off-white text, one lime accent, Inter type, and 48px-plus
touch targets. Wise defines no dark mode, so the dark values are derived from its palette
(its ink color is the page, the lime accent is unchanged).

**To change how the whole app looks, edit [frontend/app/theme.css](frontend/app/theme.css).**
All colors, fonts and corner radii are defined there as named tokens (`bg-page`,
`text-ink`, `bg-primary`, `rounded-card`…) and components use only those names. Tailwind's
default palette is switched off, and the commit skill's rule check fails if a raw color
(`#fff`, `rgb(…)`, `bg-zinc-100`) appears anywhere else. Two things sit outside the file
because they need code: the font file is loaded in `app/layout.tsx`, and the PWA
manifest's `theme_color` (milestone 5) has to be kept equal to the page color by hand.

## Getting started

You need Node 20.9+ (developed on Node 24) and pnpm. If you don't have pnpm, Node ships
with Corepack:

```sh
corepack enable pnpm
```

Then:

```sh
cd frontend
pnpm install
pnpm dev          # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | Type-check |
| `pnpm test` | Vitest |

The repo uses **pnpm only**; don't commit any other lockfile.

### Seed data

On first launch the local database seeds itself with 25 exercises, a default "Full Body"
template, and about six weeks of full-body sessions, so sorting and prefill can be judged
against something realistic. The data is deterministic, and it deliberately includes
stale exercises, never-performed ones, exercises outside the template, and warmup, drop
and failure sets alongside working sets.

Seeding happens once, when the database is first created — a reload never reseeds. To
start over in development, delete the `gym-tracker` database from your browser's devtools
(Application → IndexedDB) and reload, or call `resetAndSeed()` from `lib/db.ts`, which
refuses to run in production.

### Trying it on a phone

Each milestone is checked on a real device before the next one starts. On the same Wi-Fi,
open the network URL that `pnpm dev` prints. If the page loads but doesn't work, Next.js
may be blocking dev requests from that origin — see `allowedDevOrigins` in the Next.js
docs (`frontend/node_modules/next/dist/docs/`). Wake Lock and PWA install need HTTPS, so
they'll need a deployed preview or a local HTTPS dev server.

## Data model

`set_logs` is the source of truth; everything else is either a label or derived from it.

```
exercises       id, name, pattern, default_rest_sec, archived
                pattern: squat | hinge | push | pull | accessory | core
templates       id, name, is_default
template_items  id, template_id, exercise_id, pattern, sort_order
set_logs        id, exercise_id, session_id, logged_at, weight, reps, rpe, kind
                kind: warmup | working | drop | failure
sessions        id, started_at, ended_at, template_id (label only)
                only manual end markers are stored; sessions are derived from set_logs
outbox          id, table, op, payload, created_at   — local only, never synced
```

Weights are kilograms (a weight of 0 means bodyweight), timestamps are epoch
milliseconds, and the default increment is 2.5 kg. `set_logs` never references a
template.

## Roadmap

Work goes strictly in this order, and a step isn't started until the previous one runs
end to end on a real device.

1. **Data and logging** ✅ — Dexie schema and seed data, domain functions, the board,
   one-tap logging with previous-value prefill.
2. **Sessions and timers** *(in progress)* — the gap rule, both timers, a session summary,
   and an optional End session button.
3. **Patterns and coverage** — staleness sort, coverage strip.
4. **My exercises** — pick your list from a catalogue of ~70, order it yourself, and the
   board shows that list in that order.
5. **Rewards** — PR flash, weekly ring, mastery levels, and a recap page for a finished
   session (PRs and the total weight lifted).
6. **Sync and install** — Supabase, outbox sync, PWA install, persistent storage.

Until step 5, the data lives only in the browser's IndexedDB, and Safari can evict it.
That risk is accepted for now.

## Contributing

Commits follow the format in [.claude/skills/commit/SKILL.md](.claude/skills/commit/SKILL.md):
a type prefix (`feature`, `bugfix`, `refactor`, `chore`, `docs`, `test`), the name of the
main change, and a bullet list of what was done. That skill also documents the checks to
run first, including a script that flags violations of the architecture rules.
