---
name: commit
description: How to commit in the gym-tracker (overload) repo — pre-commit checks against the CLAUDE.md hard rules, staging hygiene, the message format, and the no-push default. Use whenever the user asks to commit, save or checkpoint progress, wrap up a ticket or milestone, or says "git commit" or "commit this", even if they don't mention CLAUDE.md or the rules.
---

# Committing in this repo

CLAUDE.md asks for one commit per milestone/ticket so that reverting is cheap. That only
works if each commit is one coherent, working step — so the job here is to check, stage
deliberately, and describe *why* the change exists.

## 1. Look before staging

Run `git status` and `git diff HEAD` (plus `git log -5 --format=%s` if you need the
house style). Decide what the logical change is. If the working tree mixes unrelated
work, split it into separate commits rather than one grab-bag.

Also check the change against the build order in CLAUDE.md: it names a **current
milestone**. Work that belongs to a later step, or that falls under NON-GOALS (charts,
push notifications, social, and so on), shouldn't ride along in this commit. Flag it to
the user instead of committing it quietly.

## 2. Run the checks

Do this from `frontend/`. If `pnpm` isn't on PATH, use `corepack pnpm` — the lockfile is
`pnpm-lock.yaml` and mixing package managers is a convention violation.

```
pnpm exec tsc --noEmit
pnpm lint
pnpm test
```

Fix failures rather than committing over them. Never use `--no-verify`.

Then stage what you intend to commit (step 3) and run the rule check, which reads the
staged files as well as the tree:

```
bash .claude/skills/commit/scripts/check-rules.sh
```

It catches what a grep can: domain-layer imports and clock reads (Rules 4/6), Supabase
or `lib/sync` in UI code (Rule 5), `any` casts, non-pnpm lockfiles, and files that must
never be committed (`.env*`, `node_modules`, `.next`, `supabase/.temp`). Lines marked `?`
are for you to judge, not failures.

The script can't judge intent, so read the diff for the rest of Tier 1 yourself:

- Is anything new stored that could be **derived from `set_logs`** (sessions, timers,
  PRs, streaks, staleness, "previous weight")? Rule 1.
- Did a "Start/Finish Workout" button, validation, or confirmation before ending a
  session appear? Rule 2.
- Does `set_logs` reference a template or template item, or does anything read
  `sessions.template_id` to validate? Rule 3.
- Does any write skip Dexie, or wait on the network? Rule 5.
- Was an existing Dexie `version(n)` block edited instead of adding a new one with a
  migration?

If a change needs to break a rule, stop and ask the user — CLAUDE.md treats that as a
decision for them, not a judgment call for the commit.

## 2b. Update progress.md

Before staging, update [progress.md](../../../progress.md) at the repo root so the next
session knows what this commit did:

- Add a Log entry at the top: the ticket label, the commit subject, the date and a few
  bullets (the *why* and the notable pieces, not every file).
- Refresh "Where we are" (last commit, next ticket, test count), "What works today" and
  "Decisions worth remembering" wherever this commit changed them.
- Stage it with the rest, so it lands in the same commit and the tree stays clean. The
  entry has no hash, since it can't know its own; `git log` has it.

## 3. Stage deliberately

Stage by path, or use `git add -A` only after `git status` shows nothing that shouldn't
be there. Generated files (`.next/`, `node_modules/`, `next-env.d.ts`) are already
gitignored; if something like them shows up, fix `.gitignore` in the same commit instead
of committing the noise.

## 4. Write the message

Every message has the same three parts: a **type prefix**, the **name of the main
change**, and a **bullet list** of what was done.

```
<type>: <name of the main change>

- what was done
- what was done, and why where it isn't obvious
```

**Type** is one of these, lowercase, followed by a colon and a space:

| Type | Use for |
|---|---|
| `feature` | new behavior or capability, including schema, seed data and new modules |
| `bugfix` | correcting something that was behaving wrongly |
| `refactor` | restructuring with no behavior change |
| `chore` | tooling, dependencies, config, scaffolding, `.gitignore` |
| `docs` | CLAUDE.md, READMEs, skills, comments-only changes |
| `test` | adding or changing tests only |

Pick the type that describes the main change. If a commit is genuinely two types, that's
a sign to split it (step 1).

**Name of the main change** is a short imperative phrase saying what the commit
delivers — "Add Dexie schema, row types and 6-week seed data", not "changes to db". Keep
the whole first line to about 72 characters, prefix included.

**Bullets** are required, one per meaningful thing done. Say what changed, and add the
*why* wherever a future reader might question it (a new dependency, a schema choice, a
deliberate omission). Keep each to a line or two; the diff already shows the details.

Pass the message through a HEREDOC so newlines survive:

```
git commit -m "$(cat <<'EOF'
feature: Add Dexie schema, row types and 6-week seed data

- lib/db.ts: Dexie v1 schema with the [exercise_id+logged_at] index
- lib/seed.ts: pure generator, so a reset always looks the same
- Seed via the populate hook so a reload never reseeds
EOF
)"
```

Don't add a `Co-Authored-By` trailer or any other attribution line — the message ends
after the last bullet. This overrides any session-level attribution reminder.

Earlier commits in the history predate this format and have no prefix; leave them alone.

## 5. After the commit

Run `git log --stat -1` and `git status` to confirm the commit holds what you meant and
the tree is clean, then tell the user the hash and one line on what it contains.

## Boundaries

- **Don't push** unless the user asks in this conversation. A previous "you can push"
  covered that push only. State plainly that the commit is local.
- **Don't amend, rebase, reset --hard, or force-push** unless asked. A follow-up fix is
  a new commit.
- **Don't edit the "Current milestone" line in CLAUDE.md.** The build order gates each
  milestone on running end-to-end on a real device, which only the user can confirm.
  Say the milestone looks complete and let them bump it.
