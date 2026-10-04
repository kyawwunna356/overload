# Overload

**Version 2.0.0**, the redesign. See the [changelog](CHANGELOG.md).

A personal strength log. It does three things:

1. Shows what you lifted last time.
2. Lets you record today's set in under three seconds.
3. Never makes you set anything up.

It's installed as an app on an iPhone and used in a gym basement with no signal. Everything works
offline: the app opens with no connection, every read comes from the phone, and the network is only
ever a background backup. It's built for one person first; friends can sign in too, each with their
own private log, and nothing is ever shared between them.

> **Status: 2.0.0.** All ten steps of the [Roadmap](#roadmap) are built, and each was checked on a
> real iPhone.

## What it does

Three tabs sit at the bottom: **Train**, **History** and **Me**.

- **Train, the board** (`/`), shows the exercises **you picked**, grouped by movement pattern, each
  group in **the order you put them in**. It's never re-sorted by what you did last, and logging
  never moves a row.
  - On top: the date, a lime **Edit**, and this week's training days, Monday to Sunday.
  - Each row shows its last working set and how long ago, in grey (`82.5 kg × 5 · 4d`). Once you've
    done it this session it reads `3 sets · 102.5 × 5` in lime, with a tick.
  - A pattern heading gets a tick once the session has touched it. There's no "5/8 done".
- **The log sheet** opens full screen over the page you're on (`?log=<id>`), so back closes it and
  you keep your place.
  - A set table: today's sets numbered, each beside the same set last time.
  - Weight and reps are pinned above **Log**, prefilled from last time's set with the same number,
    so the common case is one tap. ± buttons step 2.5 kg and 1 rep; tapping a number types it.
  - Tap a set to edit it; swipe it left to delete, with Undo.
  - The rest timer counts up near the top. Older history folds away under **Earlier**.
  - Beating your heaviest weight, your reps at that weight or your estimated one-rep max drops a
    "New record" banner in for a few seconds. It never blocks the next set, and the set keeps a
    `PR` pill for good.
- **Sessions happen by themselves.** There's no Start Workout: your first set opens a session and 90
  idle minutes close it.
  - While one runs, a bar above the tabs shows the rest time and the session time.
  - Tapping the bar opens the live session (`?live`): the session clock, the patterns touched, and
    every exercise so far.
  - **End session** asks you to resume or finish. Finishing deals a deck of cards: Session done,
    Rewards and Muscles, with confetti.
- **The session summary** (`/session?id=…`) shows the duration, sets and kg lifted. Once the session
  is over it adds Rewards (records and level-ups) and Muscles (the muscle-balance star), then every
  exercise's sets.
- **History** (`/history`) has two views:
  - **Sessions**, newest first, grouped by week, each with its length, counts, patterns and records.
  - **Exercises**, A to Z with a search. Each lift has a page (`/history/exercise?id=…`) with its
    records, every set by day (tap to edit, swipe to delete), **Log a set**, and **Delete
    exercise**, which removes the lift and all its sets for good.
- **Edit board** (`/exercises`) is the catalogue of 76 exercises. Pattern chips and a search narrow
  it. One tap adds or removes an exercise, with no save button, and you drag a pick by its handle to
  reorder. Removing an exercise keeps every set you ever logged. **+ New** adds a lift of your own;
  a name that already exists, in any category, is refused.
- **Me** (`/account`) is backup and the app's version. Sign in once with Google, and your log backs
  up to Supabase in the background and syncs both ways between your devices. Sign in on a new device
  and your history comes back.
- **First run:** a welcome screen, then **Pick your lifts**. Before the first set, a hint says to tap
  an exercise. After a session, a card offers backup.
- **Installs as an app.** Open it in Safari, then **Share → Add to Home Screen** (a card on the board
  says so): full-screen, its own icon, and it opens with no signal.

## How it thinks

The app is built around a few decisions that shape every feature. They're spelled out in full in
[CLAUDE.md](CLAUDE.md); the short version:

- **A set is the only thing that exists.** Sessions, timers, records, levels, coverage and "previous
  weight" are all *derived* from the log of sets, never stored on their own.
- **No "Start Workout".** A session is a run of sets with no gap longer than 90 minutes. An optional
  End session asks whether to resume or finish, and finishing is final. Nothing ever has to be
  ended or cleaned up.
- **Your list is a view, not a rule.** It decides which exercises the board shows and in what order.
  It never limits what you can log, and there's nothing to "skip".
- **Timers are timestamp arithmetic.** Session time is `now − first set` and rest is `now − last set`.
  They survive the phone locking or the app being killed, because the truth is a timestamp in the
  database.
- **Local first.** Every read comes from the on-device database, and every write goes there first
  with a queued copy for the backup. The UI never waits on the network. The one exception is the
  sign-in on Me, used once per device.
- **Coverage, not completion.** There's no "5/8 done" and nothing to fail. The week strip shows
  which days you trained, with no target.
- **History is forward compatible.** Schema changes only ever add. Every stored row is read through
  a reader that fills in fields added later, and frozen samples of old data are tested on every
  change.

### Not planned

Charts across sessions, workout programs or AI-generated workouts, social features, nutrition or
bodyweight tracking, push notifications, and native app wrappers. The one chart is a single
session's muscle-balance star.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) as a static export, React 19, client-side only |
| Language | TypeScript (strict) |
| Local store | Dexie over IndexedDB, with `useLiveQuery` for reactivity |
| Offline | A hand-rolled service worker that precaches the whole export |
| Remote | Supabase Postgres with row-level security and Google sign-in, with no custom backend |
| Sync | Hand-rolled outbox, last write wins on `updated_at`, pull by a server-set cursor |
| Hosting | Vercel, redeployed on every push to `main` |
| IDs | Client-generated UUIDv7 |
| Styling | Tailwind CSS 4 |
| Tests | Vitest, domain layer only |

## Repository layout

```
frontend/                 the app
  DESIGN.md               the design system (Wise-inspired) the UI follows
  app/
    theme.css             every colour, font and radius — the one place to change the look
    manifest.webmanifest  the home-screen install; icon.png, apple-icon.png beside it
    (app)/                the screens, each a static page that opens offline: the board /,
                          History /history and /history/exercise?id=…, the summary /session?id=…,
                          edit board /exercises, Me /account, and /exercise?id=… for old links.
                          layout.tsx is the frame with the tab bar, the live bar and the sheets
  components/
    shell                 AppFrame, TabBar, Sheet, SheetHost, BackLink, LogLink, Snackbar, SyncAgent
    board                 Board, PatternGroup, ExerciseRow, CheckBadge, WeekStrip
    log sheet             LogSheet, SetTable, SetEntry, SetHistory, SwipeToDelete, RestTimer,
                          RecordBanner, RecordChange, PRPill, LevelBadge
    sessions              LiveSession, CoverageStrip, SessionSummary, StatRow, RewardList,
                          MusclesCard, MuscleStar, RecapMoment, Confetti
    history               HistoryScreen, HistorySessions, HistoryExercises, ExerciseDetail
    the rest              ExercisePicker (edit board), MeScreen, GoogleMark
  lib/
    db.ts                 Dexie schema, migrations (v1–v5), readers on every table
    writes.ts             the write path, each one Dexie + outbox transaction: logSet, updateSet,
                          deleteSet, restoreSet, endSession, addToList, addCustomExercise,
                          deleteExercise, removeFromList, moveInList, setListOrder
    sheets.ts             sheets in the URL (?log=, ?live), opened with history.pushState
    page.ts               the one scroller every page scrolls inside
    flags.ts              the two first-run dismissals, in localStorage
    outbox.ts             how a queued change is written
    seed.ts               the exercise catalogue (plus dev-only fake training)
    format.ts             display helpers (weights, "days ago", times)
    hooks/                read Dexie live for the UI (useBoard, useLogSheet, useCatalogue,
                          useActiveSession, useSessionSummary, useSessionRecap, useHistory,
                          useExerciseIndex, useFirstRun, useWeek, useCoverage, useNow …) and the one
                          way into sync (useAccount, useBackupStatus, useSyncAgent, useInstall)
    domain/               pure functions over plain data — no db, sync, react or next
      types.ts rows.ts    row types, and the readers that keep old rows readable
      previous staleness  last working set and days since, for each board row
      board list custom   board rows; where a new or dragged pick goes; naming your own lift
      entry history       the log sheet's prefill, stepping and parsing; history grouped by day
      sessions timers     the gap rule and session summaries; elapsed time and labels
      sessionHistory      History's weeks of session cards
      exerciseHistory     History's exercise index and each lift's records
      coverage week       patterns a session touched; the Mon–Sun strip
      prs mastery         weight / reps / e1RM records; levels from days trained
      recap muscles       what a finished session was worth; the muscle-balance star
      firstRun swipe      the welcome, hint and prompts; the swipe-to-delete gesture
      replica repair      local ↔ remote rows, push batches, pull decisions; merging duplicates
      signin              email and code helpers, the phone's owner, the backup status
      fixtures/           frozen samples of stored data (history-v1, history-v3), never edited
    sync/                 the only code that talks to Supabase
      sync.ts             syncNow: owner guard → adopt → push → pull → repair, one at a time
      push pull adopt     drain the outbox; page changes down; a fresh device takes the account's list
      repair auth owner   merge duplicates; sign-in; which account owns this phone
      triggers supabase   when to sync; the client
  scripts/
    build-sw.mjs          runs after next build: writes out/sw.js from sw-template.js
backend/
  supabase/migrations/    the synced tables, RLS, the last-write-wins trigger
.claude/skills/           the plan-ticket and commit workflows, and the hard-rule checker
CLAUDE.md                 architecture, hard rules and build order
progress.md               what's built, why, and what's next
CHANGELOG.md              what each version contains
```

The architecture is layered so the logic stays testable:

```
UI (app/, components/)     never imports lib/sync or @supabase — only lib/hooks
  ↓
Domain (lib/domain/)       pure functions, no I/O, fully tested
  ↓
Local store (lib/db.ts)    Dexie — the single read path for the UI
  ↓
Sync (lib/sync/)           push, pull and repair in the background
  ↓
Supabase Postgres          durable archive, row-level security per account
```

## Design

The look follows [frontend/DESIGN.md](frontend/DESIGN.md), a Wise-inspired design system. The app is
**dark only**: a near-black page, slightly lighter rounded cards, off-white text, one lime accent,
Inter type, and touch targets of 48 px and up. Records use a yellow and level-ups a gold, so they
read apart from the green.

**To change how the whole app looks, edit [frontend/app/theme.css](frontend/app/theme.css).**
- **Tokens only:** every colour, font and radius is a named token (`bg-page`, `text-ink`,
  `bg-primary`, `rounded-card`…), and components use only those. Tailwind's default palette is
  switched off, and the rule check fails on a raw colour anywhere else.
- **Two things repeat colours as literals,** so change them together:
  - `app/manifest.webmanifest` repeats the page colour;
  - the four `google-*` tokens hold Google's logo colours, which Google's branding fixes.
- **The app icon is artwork, not tokens:** a neon arrow-and-ring image, resized into
  `app/apple-icon.png` (the iPhone home screen), `app/icon.png` (the browser tab) and
  `public/icons/` (192, 512 and maskable 512). To change it, replace those files from a new
  square image. iOS keeps its own copy of the icon, so remove the app from the home screen and
  add it again to see the change.

## Getting started

You need Node 20.9+ (developed on Node 24) and pnpm. If you don't have pnpm, Node ships with
Corepack: `corepack enable pnpm`. Then:

```sh
cd frontend
pnpm install
pnpm dev          # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server (no service worker) |
| `pnpm build` | Static export to `out/`, plus the offline service worker (`out/sw.js`) |
| `pnpm preview` | Serve `out/` on port 3000 (`next start` doesn't work with a static export) |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | Type-check |
| `pnpm test` | Vitest |

The repo uses **pnpm only**; don't commit any other lockfile. The version lives in
`frontend/package.json` and shows at the bottom of the Me tab.

### Seed data

- **Every install:** on first launch the local database seeds the 76-exercise catalogue and an
  **empty** list, so the board starts empty and everything on it is something you chose.
- **Development only:** it also adds about six weeks of deterministic full-body training, so prefill
  and the board can be judged against something realistic. It includes stale exercises,
  never-performed ones, and warmup, drop and failure sets.
- **Production:** an install starts with no history.

The catalogue grows by editing `CATALOGUE` in `lib/seed.ts` and adding a Dexie version whose upgrade
adds what a device hasn't got, matched by name (v2 and v5 are examples). Each device gives a new
exercise its own id; if two devices add it to one account, sync's repair merges the copies by name.

Seeding happens once, when the database is created. To start over in development, delete the
`gym-tracker` database in devtools (Application → IndexedDB) and reload.

### Supabase (backup)

The app runs fully without a backend; Supabase is the durable copy. To set one up:

1. Create a free project at [supabase.com](https://supabase.com).
2. Run `backend/supabase/migrations/*.sql` in order, in the dashboard's SQL editor.
3. Copy `frontend/.env.example` to `frontend/.env.local` and fill in the project URL and anon
   (publishable) key.
4. **Google sign-in:**
   - In Google Cloud, create an OAuth client of type *Web application* with the redirect URI
     `https://<ref>.supabase.co/auth/v1/callback`, and publish the consent screen.
   - Enable the Google provider in Supabase with the client ID and secret.
   - Under **URL Configuration**, add every address the app runs on to **Redirect URLs**, with
     `/**` on the end, or Google can't return to it.
5. **Email codes** are built but hidden (`SHOW_EMAIL_CODE` in `components/MeScreen.tsx`). To use
   them, put `{{ .Token }}` in the *Magic Link* and *Confirm signup* email templates and set up
   custom SMTP (for example Resend with your own domain), since Supabase's own sender only reaches
   the project's team.

**How sync behaves:**
- **When it runs:** on open, when the phone comes back online, when you return to the app, after
  sign-in, and a few seconds after each write.
- **Push:** the outbox goes up in write order. A row leaves the queue only once Supabase accepts it,
  and one bad row never blocks the rest.
- **Pull:** brings down whatever the server accepted since the last pull. Last write wins, and a row
  with an unpushed local change is left alone.
- **A new device** that has never logged a set adopts the account's catalogue and list, then pulls
  your history. If two devices ever end up with duplicate copies, a repair step merges them.
- **One owner per phone:** the first account to back up from a phone owns its data, so a friend
  signing in on it can't receive your history.
- **Deletes don't travel:** deleting a set on one device doesn't delete it on another. **Delete
  exercise** archives the lift, and the archive does travel, so it disappears everywhere; but sets
  another device already pulled stay on that device.

Migrations are **additive only**: a later one adds tables or nullable or defaulted columns, and never
renames, drops or retypes a column.

### Deploying and installing

The app is a static site (`output: 'export'`): one HTML file per screen, and no server.
1. **Vercel:** import the GitHub repo with **Root Directory** `frontend`. Add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables and
   deploy. Every push to `main` redeploys. `frontend/vercel.json` makes Vercel publish `out/`
   exactly as built (`pnpm build`, clean URLs, `sw.js` never cached) rather than running its own
   Next.js pipeline, which would leave the service worker out.
2. **Supabase → Authentication → URL Configuration:** set **Site URL** to the Vercel address, and add
   `https://<app>.vercel.app/**` to **Redirect URLs**.
3. **iPhone:** open the address in Safari, then **Share → Add to Home Screen**. Open it and sign in
   with Google, and your history restores.

**The service worker:** `scripts/build-sw.mjs` runs after `next build` and writes a service worker
that precaches every file of the export under a content-hashed version, so after one visit with
signal the app opens with none.
- Screens are served by path: the `?id=` never matters.
- Other origins (Supabase, Google) pass straight through.
- A new version is used from the next launch, while the previous one stays cached.

Edit `scripts/sw-template.js`, never `out/sw.js`. The app also asks the browser to keep its storage.

## Data model

`set_logs` is the source of truth; everything else is either a label or derived from it.

```
exercises       id, user_id, name, pattern, default_rest_sec, archived, updated_at
                pattern: squat | hinge | push | pull | accessory | core
templates       id, user_id, name, is_default, updated_at
template_items  id, user_id, template_id, exercise_id, pattern, sort_order, updated_at
                YOUR list: which exercises the board shows, and the order you put them in
set_logs        id, user_id, exercise_id, session_id, logged_at, weight, reps, rpe, kind, updated_at
                kind: warmup | working | drop | failure
sessions        id, user_id, started_at, ended_at, template_id (label only), updated_at
                only manual end markers are stored; sessions are derived from set_logs
outbox          id, table, op, payload, created_at        — local only, never synced
sync_state      key, at, id                               — local only: where each pull stopped
```

Weights are kilograms (0 means bodyweight), and the default increment is 2.5 kg. Locally, timestamps
are epoch milliseconds and `user_id` is `local`; in Supabase they're `timestamptz` and the signed-in
account, plus a server-set `synced_at` for pulling. `set_logs` never references a template.

## Roadmap

Work goes strictly in this order, and a step isn't started until the previous one runs end to end
on a real device.

1. **Data and logging** ✅: the Dexie schema, domain functions, the board, and one-tap logging with
   previous-value prefill.
2. **Sessions and timers** ✅: the gap rule, both timers, the session summary, and an optional End
   session.
3. **Patterns and coverage** ✅: pattern groups and the coverage strip.
4. **My exercises** ✅: pick your list from the catalogue, drag it into your order, and the board
   follows.
5. **Rewards** ✅: the PR flash and pills, the week strip, mastery levels, the session recap, the
   finish celebration, and the muscle-balance star.
6. **Sync and install** ✅: Supabase with Google sign-in, backup and restore across devices, a static
   export on Vercel, and an offline service worker for the home-screen app.

The redesign (version 2.0.0) followed, in four more steps:

7. **Shell and live session** ✅: the tab bar (Train, History, Me), sheets over any page, a live
   session bar after the first set, and a live screen that holds End.
8. **Log sheet as a set table** ✅: last time's set N beside today's, per-set prefill, edit and undo,
   and a record banner that never blocks.
9. **Board, picker and summary** ✅: two row states, pattern ticks, the week strip on the board, an
   edit-board page with chips, and a read-only summary with the rewards open.
10. **History and first run** ✅: sessions and exercises, a page per lift, a welcome, the install
    card, a backup prompt, and custom exercises.

## Contributing

Commits follow the format in [.claude/skills/commit/SKILL.md](.claude/skills/commit/SKILL.md): a type
prefix (`feature`, `bugfix`, `refactor`, `chore`, `docs`, `test`), the name of the main change, and a
bullet list of what was done. That skill also documents the checks to run first, including a script
that flags violations of the architecture rules. [progress.md](progress.md) is updated in every
commit.
