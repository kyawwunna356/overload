---
name: plan-ticket
description: How to plan the next ticket in the gym-tracker (overload) repo, in plan mode, before writing any code — what to read, how to name the ticket, and the plan structure that tells the user what we're going to do, the main features, and the main changes. Use whenever the user switches to plan mode, finishes a ticket and moves on, or says "plan the next ticket", "what's next", "start Ticket N", or asks what a ticket will involve, even if they don't say "plan".
---

# Planning a ticket

Every ticket is planned before it's built, so the user can steer while changing course is
still free. The plan has one job: tell the user, in terms they can react to, **what we're
about to do, what they'll get (the main features), and what will change in the repo (the
main changes).** Everything below serves that.

## 1. Orient (read-only)

Do this before writing a word of the plan.

- Read `progress.md` at the repo root first: what's built, the decisions behind it, and
  what's next. It's the history of earlier sessions.
- `git status` and `git log --oneline -5`. Confirm the previous ticket is committed, and
  say whether it's pushed. If the tree holds unrelated uncommitted work, flag it first.
- Read CLAUDE.md for the **current milestone**, the build order, the UI rules and the
  non-goals. The build order gates each milestone on running end to end on a real
  device, so don't plan across a milestone boundary unless the user has confirmed that.
- Read [tickets.md](tickets.md) to find the next ticket. If the milestone has no tickets
  yet, propose a breakdown as part of the plan: one main feature per ticket, small
  enough to verify end to end, ordered so each builds on the last.
- Read the code the ticket will touch or reuse, rather than guessing at it. The repo is
  small, so read directly; reach for an Explore agent only if the search really sprawls.
- For a ticket with UI, `frontend/AGENTS.md` warns that this Next.js version has breaking
  changes and points to `frontend/node_modules/next/dist/docs/`. Read the relevant guide
  and list it in the plan, so the plan doesn't rest on remembered APIs.
- For a ticket with UI, also read `frontend/DESIGN.md` (the Wise-inspired design system)
  and `frontend/app/theme.css`. Plan the UI from the semantic tokens defined in
  `theme.css` (`bg-card`, `text-ink`, `rounded-card`…), never raw colors: that file is the
  single place the app's look is changed from, and the commit skill's rule check fails on
  a raw color anywhere else. If a ticket needs a token that doesn't exist, the plan adds
  it to `theme.css`.

## 2. Name it

Call it **"Ticket N: main feature"** — the number plus a short name for the one main
thing it delivers, e.g. "Ticket 3: Board — pattern groups, staleness sort, last weight
inline". Use the full label every time it's mentioned; a bare number tells the user
nothing. If you can't name it in one phrase, it's two tickets.

## 3. Write the plan

Write it to the plan file that the plan-mode message names. Use this structure, and drop
any section that would be empty:

```
# Ticket N: main feature

## Context
Why this ticket, why now, what it unlocks.

## Main features
What the user will be able to do or see when it's done, as bullets. Behavior first,
implementation second.

## Main changes
Files to create or modify, one line each, and the existing code to reuse (with paths).

## Rules in play
Which hard rules and UI rules this ticket touches, and how it stays inside them.

## Decisions to confirm
Each with a recommended default and the alternative in a line.

## Out of scope
What's deliberately left for later tickets.

## Verification
Commands to run. For UI, what to look at, and what only the real device can confirm.

## Commit
The proposed message, in the commit skill's `type: main change` format, ready for when
the user asks. Planning a commit is not committing.
```

Main features come first because the user reads a plan asking "what will I get?", and
main changes second because the next question is "what will this touch?".

Be concrete — function names and signatures, edge cases, exact file paths — because the
approved plan is the spec you'll build from. Recommend one approach instead of surveying
options, and reuse existing code rather than proposing new code where something fits.

## 4. Hand over

Reply in chat with the ticket's full label and a short summary: three to five lines on the
main features and the main changes. Then call ExitPlanMode; that is how approval is
asked, so don't also ask "does this look okay?" in text. Use AskUserQuestion only for a
real fork that changes what gets built. Otherwise put your recommendation under
"Decisions to confirm" and let the user overrule it on approval.

## 5. After approval

Build to the plan and run the verification. **Then stop — don't commit and don't push.**
The user reviews the code themselves first and will ask for the commit when they're happy;
that is when the commit skill applies. Leave the changes in the working tree.

Mark the ticket "built — awaiting review" in [tickets.md](tickets.md), and close with a
summary of what was built and how it was verified, saying "Ticket N: main feature is
built and ready for your review". Name the next ticket in full, but don't start planning
it until the user switches to plan mode.

When the user does ask for the commit, set the ticket to "done" in tickets.md first so
that change lands in the same commit; the hash isn't needed, `git log` has it.
