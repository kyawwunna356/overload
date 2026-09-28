# Changelog

The version lives in `frontend/package.json` and shows at the bottom of the app's Back up screen.
Each release is tagged in git as `vX.Y.Z`.

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
