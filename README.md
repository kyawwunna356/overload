# Overload

A personal strength log. It does three things:

1. Shows what you lifted last time.
2. Lets you record today's set in under three seconds.
3. Never makes you set anything up.

It's a single-user app, installed as a PWA on an iPhone and used in a gym basement with
no signal. Everything works offline; the network is only ever a background backup.

> **Status: in development.** Four of the six steps in the [Roadmap](#roadmap) are done and
> each was checked on a real iPhone. What's left is the rewards step and then sync, so
> today everything lives on the one device.

## What it does today

- **The board** (`/`) shows the exercises **you picked**, grouped by movement pattern, each
  group in **the order you put them in** — never re-sorted by what you did last, and logging
  never moves a row. Every row carries its last working set and how long ago (`82.5 kg × 5 ·
  3d`). A pattern you haven't picked for says so and offers the catalogue.
- **Your list** comes from a catalogue of 73 exercises (`/exercises`, or the `+` on a group
  for just that pattern). Tap to add or remove — one tap, no save button — search by name, and
  drag a row by its handle to reorder it. Removing an exercise keeps every set you ever logged.
- **The log sheet** (`/exercise?id=…`) shows the last working set as large ghost values: one
  tap repeats it, or use the ± buttons (2.5 kg, 1 rep) or type. Warmup / working / drop /
  failure chips, and the whole history below, grouped by day.
- **Sessions happen by themselves.** Your first set opens one; 90 idle minutes closes it. A
  small grey session timer and a prominent rest timer appear while one is running, and a
  coverage strip shows which patterns it has touched.
- **The session summary** (`/session?id=…`) lists what you did, grouped by exercise, with the
  time span and how long it took. **End session** there asks: resume, or finish for good.

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
- **Coverage, not completion.** While a session is running the board shows which movement
  patterns it has touched (`Squat ✓ Hinge ✓ Push …`), never "5/8 done". Streaks are weekly,
  not daily.

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
  components/             Board, PatternGroup, ExerciseRow, CoverageStrip, LogSheet, SetEntry,
                          SetHistory, SessionSummary, SessionHeader, RestTimer, SessionEndBar,
                          ExercisePicker, BackLink
  lib/
    db.ts                 Dexie schema, seeding, dev reset
    writes.ts             the write path: logSet / deleteSet / endSession, and addToList /
                          removeFromList / moveInList / setListOrder for your list —
                          each one Dexie + outbox transaction
    seed.ts               the exercise catalogue plus ~6 weeks of realistic training data
    format.ts             display helpers (weights, "days ago", times)
    uuid.ts               UUIDv7 ids
    constants.ts          local user id
    hooks/                useBoard, useLogSheet, useCatalogue, useCoverage, useActiveSession,
                          useSessionSummary, useNow — read Dexie live for the UI
    domain/               pure functions over plain data — no db, sync, react or next
      types.ts            row types shared by everything
      previous.ts         last working set of an exercise (prefill)
      staleness.ts        days since an exercise was last performed
      board.ts            builds the home screen from your list, in your order
      list.ts             your list: where a new pick goes, and where a dragged row lands
      coverage.ts         which movement patterns a session has touched
      entry.ts            stepping and parsing for the log sheet's weight and reps
      history.ts          groups an exercise's sets by day (Today, Yesterday, weekday, date)
      sessions.ts         the gap rule: derives sessions, the active one, a session summary,
                          and the end-marker time used when a session is finished
      timers.ts           elapsed time for the session and rest timers, and duration labels
      staleness / previous are still used for each row's "82.5 kg × 5 · 3d"
backend/
  supabase/               Supabase project config and migrations (the synced tables, RLS)
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

`lib/sync/` and the PR, weekly-ring and mastery modules don't exist yet; everything else
listed above does.

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
manifest's `theme_color` (step 6) has to be kept equal to the page color by hand.

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

On first launch the local database seeds itself with the catalogue of 73 exercises and an
**empty** list (so the board starts empty and every exercise on it is one you chose). In
**development only**, it also adds about six weeks of full-body sessions, so prefill and the
board can be judged against something realistic. A production install starts with no history,
and the Dexie v3 upgrade removed the fake sets from devices seeded before then. The data is deterministic, and it deliberately includes stale
exercises, never-performed ones, and warmup, drop and failure sets alongside working ones.

The catalogue grows by editing `CATALOGUE` in `lib/seed.ts`; a Dexie migration adds whatever
a device hasn't got yet, matched by name, and never removes anything.

Seeding happens once, when the database is first created — a reload never reseeds. To
start over in development, delete the `gym-tracker` database from your browser's devtools
(Application → IndexedDB) and reload, or call `resetAndSeed()` from `lib/db.ts`, which
refuses to run in production.

### Supabase (backup)

The app runs fully without a backend; Supabase is the durable copy. To set one up:

1. Create a free project at [supabase.com](https://supabase.com).
2. Run `backend/supabase/migrations/*.sql` in order, either in the dashboard's SQL editor
   or with `pnpm dlx supabase link --project-ref <ref>` then `pnpm dlx supabase db push`
   from `backend/`.
3. Copy `frontend/.env.example` to `frontend/.env.local` and fill in the project URL and
   anon key (Project Settings → API).
4. **Sign-in** (Authentication in the dashboard):
   - **Google:** in Google Cloud, create an OAuth client of type *Web application* with the
     redirect URI `https://<ref>.supabase.co/auth/v1/callback`, and publish the consent screen
     so anyone can sign in. Then enable the Google provider in Supabase with its client ID and
     secret.
   - **Email code:** in Email Templates, put `{{ .Token }}` in *Magic Link* and *Confirm
     signup*, so the email carries a code rather than only a link. Supabase's built-in sender
     only reaches the project's team; add custom SMTP (for example Resend with your own domain)
     so it reaches anyone.
   - **URL Configuration:** add every origin the app runs on to the redirect URLs, with `/**`
     (for example `http://localhost:3000/**`), or Google can't return to it.

Once signed in, the app backs up in the background: the outbox drains on open, when the phone
comes back online, when you return to the app, and a few seconds after each write. The first
account to back up from a phone owns that phone's data, so a friend signing in on it can't
receive your history.

Migrations are **additive only**: a later one adds tables or nullable/defaulted columns and
never renames, drops or retypes, so history stored today always stays readable.

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
                YOUR list: which exercises the board shows, and the order you put them in
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
2. **Sessions and timers** ✅ — the gap rule, both timers, the session summary, and an
   optional End session that asks whether to resume or finish.
3. **Patterns and coverage** ✅ — pattern groups and the coverage strip.
4. **My exercises** ✅ — pick your list from a catalogue of 73, drag it into the order you
   train it, and the board shows that list in that order.
5. **Rewards** *(next)* — PR flash, weekly ring, mastery levels, and a recap page for a
   finished session (PRs and the total weight lifted).
6. **Sync and install** — Supabase, outbox sync, PWA install, persistent storage.

Until step 6, the data lives only in the browser's IndexedDB, and Safari can evict it.
That risk is accepted for now.

## Contributing

Commits follow the format in [.claude/skills/commit/SKILL.md](.claude/skills/commit/SKILL.md):
a type prefix (`feature`, `bugfix`, `refactor`, `chore`, `docs`, `test`), the name of the
main change, and a bullet list of what was done. That skill also documents the checks to
run first, including a script that flags violations of the architecture rules.
