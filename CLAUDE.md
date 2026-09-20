# Gym Tracker — Project Context

A personal strength log. Its only job: **show me what I lifted last time, let me record
today's set in under three seconds, and never make me set anything up.**

Single user, installed as a PWA on iOS, used in a gym basement with no signal.

---

## TIER 1: HARD RULES

These are load-bearing architectural decisions, not preferences. Violating one is a bug
even if the code works. If a change requires breaking one of these, stop and ask.

### 1. A set is the only thing that exists

`set_logs` is the single source of truth. Sessions, timers, PRs, streaks, coverage,
staleness and "previous weight" are all **derived** from it. Do not introduce stored
state for anything that can be computed from `set_logs`.

### 2. Sessions are derived, never started

There is **no "Start Workout" button and no "Finish Workout" button.** A session is a run
of sets with no gap larger than `SESSION_GAP_MINUTES` (90). The first set logged opens a
session implicitly; an idle gap closes it.

Finishing a session must **always** be possible, unconditionally. There is never a
validation step, a confirmation dialog, or a cleanup task before a session can end.

### 3. Templates are a view, never a constraint

`templates` / `template_items` decide **what appears on screen and in what order.** They
have zero authority over what gets saved.

- `set_logs` must **never** reference a template or template item.
- An exercise in the template with no logged sets simply does not exist in that session.
  There is nothing to skip, nothing to delete, nothing to clean up.
- `sessions.template_id` may exist as a **label only**. Never read it to validate anything.

### 4. Timers are timestamp arithmetic, never counters

Both timers are pure functions of `set_logs`:

- Session timer = `now − firstSetOfSession.logged_at`
- Rest timer = `now − lastSet.logged_at` (counts **up**, no target, no expiry)

`setInterval` may **only** be used to trigger a repaint. It is never the source of truth.
Never store a timer, never `start()` or `stop()` one, never accumulate elapsed time in
state. This must survive the phone locking, the tab backgrounding, and the webview being
killed — because the truth is a timestamp in the database.

Also re-read the clock on `visibilitychange` so the value snaps to correct on resume.

### 5. Local is the source of truth; the network is never in the hot path

- Every **read** in the UI comes from Dexie. Never from Supabase.
- Every **write** goes to Dexie first, then enqueues an `outbox` row.
- The UI must never await the network, show a network spinner, or behave differently
  offline. Assume there is no signal.

### 6. The domain layer is pure

Nothing in `lib/domain/**` may import from `lib/db`, `lib/sync`, `next/*`, or `react`.
Pure functions over plain data, no I/O. This boundary is what makes the logic testable and
portable. Enforce it in review; if it's awkward, the function is in the wrong folder.

---

## NON-GOALS

Do not build these, do not suggest them, do not leave hooks for them:

- Charts, graphs, analytics dashboards, volume trends
- Workout programs, AI-generated workouts, periodisation
- Social features, sharing, feeds, following
- Nutrition, bodyweight, measurements, photos
- Push notifications of any kind (rest timer is visual only)
- Native app wrappers, App Store distribution

---

## STACK

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), client-heavy — no SSR on the logging path |
| Language | TypeScript, strict |
| Local store | Dexie over IndexedDB, `useLiveQuery` for reactivity |
| Remote | Supabase Postgres + RLS. No custom backend server. |
| Sync | Hand-rolled outbox, last-write-wins on `updated_at` |
| IDs | Client-generated UUIDv7 (time-sortable, no reconciliation) |
| Styling | Tailwind |
| Tests | Vitest, domain layer only |

---

## ARCHITECTURE

```
UI (app/, components/)          never imports lib/sync or @supabase
  ↓
Domain (lib/domain/)            pure functions, no I/O, fully tested
  ↓
Local store (lib/db.ts)         Dexie — the single read path for the UI
  ↓
Sync (lib/sync/)                flush outbox on `online` + on foreground
  ↓
Supabase Postgres               durable archive only
```

```
app/
  (app)/page.tsx                 board (home)
  (app)/exercise/[id]/page.tsx   log sheet
  (app)/session/[id]/page.tsx    session summary
  (app)/manage/page.tsx          exercises + template
  (app)/history/page.tsx         sessions + per-exercise history
lib/
  db.ts                          Dexie schema + migrations
  domain/                        PURE. no db, no sync, no react.
    sessions.ts  timers.ts  prs.ts  coverage.ts  staleness.ts
  sync/
    outbox.ts  push.ts  pull.ts  supabase.ts
  hooks/
    useElapsed.ts  useBoard.ts  useActiveSession.ts  useWakeLock.ts
components/
  PatternGroup.tsx  ExerciseRow.tsx  SetEntry.tsx
  RestTimer.tsx  SessionHeader.tsx  CoverageStrip.tsx  PRFlash.tsx
```

---

## DATA MODEL

```sql
exercises       (id, user_id, name, pattern, default_rest_sec, archived, updated_at)
                -- pattern: squat | hinge | push | pull | accessory | core

templates       (id, user_id, name, is_default, updated_at)
template_items  (id, template_id, exercise_id, pattern, sort_order)
                -- set_logs NEVER references these

set_logs        (id, user_id, exercise_id, session_id, logged_at,
                 weight, reps, rpe, kind, updated_at)
                -- kind: warmup | working | drop | failure

sessions        (id, user_id, started_at, ended_at, template_id?, updated_at)
                -- materialised by the gap rule; template_id is a label only

outbox          (id, table, op, payload, created_at)   -- local only, never synced
```

Critical index — the query the entire app is built around:

```sql
create index on set_logs (user_id, exercise_id, logged_at desc);
```

Units are kilograms. Default increment 2.5 kg, reps ±1.

---

## DOMAIN LAYER CONTRACT

```ts
previousSet(exerciseId, logs)      // last WORKING set → prefill values
elapsed(sinceTimestamp, now)       // seconds; powers both timers
assignSession(logs, gapMinutes)    // gap rule → session_id per log
staleness(exerciseId, logs, now)   // days since last performed → board sort
coverage(sessionLogs, exercises)   // { squat: true, hinge: false, ... }
detectPR(set, history)             // weight | reps | e1RM PR → reward moment
weeklyRing(logs, target, now)      // sessions this week vs target
masteryLevel(exerciseId, logs)     // lifetime session count → level
```

All take data in, return data out. No fetching, no dates from `new Date()` inside —
pass `now` as an argument so tests are deterministic.

---

## UI RULES

**Board (home).** Grouped by movement pattern, each group sorted by **staleness**
(days since last performed), never alphabetically. Each row shows its last-performed
weight inline — value before any tap. Coverage strip at top. Session timer is small grey
text in the header.

**Log sheet.** Previous set shown as large ghost values. One tap to repeat identical.
Swipe or ± buttons for weight/reps. **Target: logging a set requires one tap and no
keyboard in the common case.** Rest timer prominent; session timer quiet. Never two
prominent counters on screen at once.

**Coverage, not completion.** Never show `5/8 exercises done` or any progress bar against
the template — that frames deviation as failure. Show pattern coverage instead
(`Squat ✓ Hinge ✓ Push ✓ Pull — Accessory —`). It is informative, never prescriptive, and
impossible to fail.

**Streaks are weekly, not daily.** Daily streaks punish rest days. Track sessions per week
against a target. Never use loss-aversion mechanics.

**Thumb-first.** Primary actions in the bottom third. Large tap targets. One-handed,
sweaty-fingered, mid-set.

---

## CONVENTIONS

- Always `pnpm` (or whichever is in the lockfile — never mix).
- Domain functions get Vitest tests. UI does not.
- Prefer `useLiveQuery` over manual state sync with Dexie.
- No `any`. No `as` casts to silence the compiler.
- Dexie schema changes require a version bump + migration, never a silent edit.
- Commit per milestone with a descriptive message, so reverting is cheap.

---

## BUILD ORDER

Work strictly in this order. Do not start a later step before an earlier one runs
end-to-end on a real device.

1. **Dexie schema + seeded exercises + board + one-tap logging with previous-value
   prefill.** ← replaces SetGraph
2. **Gap-rule sessions + both timers + session summary.** ← replaces Hevy
3. Patterns, staleness sort, coverage strip, template-as-view
4. PR flash, weekly ring, mastery levels
5. Supabase + outbox sync + PWA install + `navigator.storage.persist()`

**Current milestone: 1**

Seed ~6 weeks of realistic full-body training data early, before building UI. Without it
the board sorting and prefill behaviour can't be evaluated.

---

## KNOWN TRAPS

- **`setInterval` as the timer's source of truth.** The default pattern everywhere. Wrong
  here. See Hard Rule 4.
- **Rebuilding session-first design.** Most workout-app code on the internet has a
  `startWorkout()`. This app doesn't. See Hard Rule 2.
- **Letting the template constrain the log.** See Hard Rule 3.
- **Putting Supabase calls in components.** See Hard Rule 5.
- **Assuming IndexedDB is permanent.** Safari evicts script-written storage. Once step 5
  exists, Supabase is the durable copy; until then, accept the risk knowingly.
- **A flat list of 20 exercises.** Defeats the entire point. Group by pattern, collapse to
  likely picks.