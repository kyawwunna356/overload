# Changelog

The version lives in `frontend/package.json` and shows at the bottom of the app's Me tab.
Each release is tagged in git as `vX.Y.Z`.

## 2.0.0 — 2026-10-04 · The redesign

The whole app redesigned around three tabs, a live session and a History you can look back
through. The rules didn't change: no Start button, no setup, and every set saved on the phone first.

- **Navigation:**
  - Train, History and Me tabs at the bottom.
  - A live session bar above them from your first set until the session ends.
  - The log sheet and live session open over whatever page you're on, so back closes them and you
    keep your place.
- **Board:**
  - The date, a lime **Edit**, and this week's training days on top.
  - Each row shows last time's set and how long ago, or today's sets and best set in lime with a
    tick once you've done it.
  - A tick on each pattern heading the session has touched.
  - An Add to Home Screen card in Safari.
- **Logging:**
  - A full-screen log sheet built around a set table: today's sets numbered beside the same set
    last time.
  - Set N is prefilled from last time's set N, with weight and reps pinned above Log.
  - Tap a set to edit it; swipe to delete, with Undo.
  - A record banner that never blocks the next set.
- **Sessions:**
  - A live session screen with the session clock, the patterns touched, every exercise so far, and
    End session.
  - Finishing deals a deck: Session done, Rewards and Muscles.
  - The session summary keeps the stats, the rewards and the muscle-balance star.
- **History:**
  - Sessions grouped by week, each with its duration, sets, patterns and records.
  - Exercises A to Z, each with a page: records, every set by day, editing past sets, and
    **Delete exercise**, which removes the lift and all its sets for good.
- **Edit board:**
  - A page of its own with pattern chips, search and drag to reorder.
  - Custom exercises, one name in one category.
- **First run:**
  - A welcome screen, then pick your lifts.
  - A hint for the first set, and a prompt to back up once a session is over.
- **Look:** a neon app icon on the app's black.

## 1.0.0 — 2026-09-28 · First launch

The first version installed as an app. All six roadmap steps are built.

- **Logging:**
  - The board of your own exercises, grouped by movement pattern, in your order.
  - One-tap logging with last time's set as ghost values.
  - Day-grouped history with swipe to delete.
  - A catalogue of 76 exercises to pick and order your list from.
- **Sessions:**
  - Derived from your sets, with no Start button.
  - A session timer, a rest timer and a coverage strip.
  - The session summary, with an optional End session.
- **Rewards:**
  - A record flash, and PR pills that stay.
  - Mastery levels.
  - The week strip.
  - A recap once a session is over: total lifted, the muscle-balance star, records and level-ups.
  - The finish celebration.
- **Backup:**
  - Sign in with Google.
  - Your log backs up to Supabase in the background and syncs both ways between devices.
  - A new device restores your history, and duplicate copies are repaired.
  - Stored history stays readable through future schema changes.
- **Install:**
  - Hosted on Vercel as a static site.
  - Add to Home Screen for a full-screen app with its own icon.
  - A service worker keeps the whole app on the phone so it opens with no signal.
  - The app asks the browser to keep its storage.
