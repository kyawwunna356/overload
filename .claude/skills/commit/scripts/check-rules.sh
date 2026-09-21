#!/usr/bin/env bash
# Mechanical checks for the CLAUDE.md rules that a grep can catch. It cannot
# judge intent (e.g. "is this stored state derivable from set_logs?") — that
# stays a review step in SKILL.md. Exit 1 on any violation, 0 otherwise.
set -u

root="$(git rev-parse --show-toplevel)" || exit 2
cd "$root" || exit 2

fail=0
violation() { printf '✗ %s\n' "$1"; printf '%s\n' "$2" | sed 's/^/    /'; fail=1; }
review()    { printf '? %s\n' "$1"; printf '%s\n' "$2" | sed 's/^/    /'; }

# Only scan directories that exist yet (components/ and hooks/ arrive later).
dirs=()
for d in frontend/app frontend/components frontend/lib; do [ -d "$d" ] && dirs+=("$d"); done
src=(--include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=.next)

# Hard Rule 6: the domain layer is pure.
if [ -d frontend/lib/domain ]; then
  hits=$(grep -rnE "${src[@]}" \
    "from ['\"](next|react|dexie|@supabase)([/'\"])|from ['\"](\.{1,2}/|@/)*(lib/)?(db|sync)(/[^'\"]*)?['\"]" \
    frontend/lib/domain)
  [ -n "$hits" ] && violation "Rule 6: lib/domain imports db/sync/next/react/dexie/supabase" "$hits"

  hits=$(grep -rnE "${src[@]}" --exclude='*.test.ts' 'new Date\(\)|Date\.now\(|setInterval|setTimeout' frontend/lib/domain)
  [ -n "$hits" ] && violation "Rules 4/6: lib/domain reads the clock or uses timers (pass \`now\` in)" "$hits"
fi

# Hard Rule 5: UI never touches Supabase or the sync layer.
ui=()
for d in frontend/app frontend/components; do [ -d "$d" ] && ui+=("$d"); done
if [ ${#ui[@]} -gt 0 ]; then
  hits=$(grep -rnE "${src[@]}" "@supabase|lib/sync" "${ui[@]}")
  [ -n "$hits" ] && violation "Rule 5: app/ or components/ imports supabase or lib/sync" "$hits"
fi
if [ ${#dirs[@]} -gt 0 ]; then
  hits=$(grep -rnE "${src[@]}" --exclude-dir=sync '@supabase' "${dirs[@]}")
  [ -n "$hits" ] && violation "Rule 5: Supabase referenced outside lib/sync" "$hits"

  # Conventions: no `any`, no double-cast escape hatches.
  hits=$(grep -rnE "${src[@]}" ':\s*any\b|\bas any\b|<any>|as unknown as' "${dirs[@]}")
  [ -n "$hits" ] && violation "Convention: \`any\` or \`as unknown as\` cast" "$hits"

  # Rule 4: setInterval is fine for repaint only — surface it for a human look.
  hits=$(grep -rnE "${src[@]}" 'setInterval' "${dirs[@]}")
  [ -n "$hits" ] && review "Rule 4: setInterval may only trigger a repaint, never hold the timer's value" "$hits"
fi

# Theme: every color lives in frontend/app/theme.css, so the whole look can change from
# one place. Anywhere else, use a semantic token (bg-card, text-ink, bg-primary…).
if [ ${#dirs[@]} -gt 0 ]; then
  themesrc=(--include='*.ts' --include='*.tsx' --include='*.css' --exclude-dir=node_modules --exclude-dir=.next --exclude=theme.css)
  palette='white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
  hits=$(
    grep -rnE "${themesrc[@]}" '(^|[^A-Za-z0-9_&/])#[0-9a-fA-F]{3,8}\b' "${dirs[@]}"
    grep -rnE "${themesrc[@]}" '\b(rgba?|hsla?|oklch|oklab)\(' "${dirs[@]}"
    grep -rnE "${themesrc[@]}" "\b(bg|text|border|ring|fill|stroke|from|to|via|divide|outline|shadow|accent|caret|decoration|placeholder)-($palette)(-[0-9]{2,3})?\b" "${dirs[@]}"
  )
  [ -n "$hits" ] && violation "Theme: raw color outside app/theme.css (use a semantic token like bg-card or text-ink)" "$hits"
fi

# Never mix package managers: pnpm-lock.yaml is the only lockfile.
hits=$(git ls-files --cached --others --exclude-standard | grep -E '(^|/)(package-lock\.json|yarn\.lock|bun\.lockb?|npm-shrinkwrap\.json)$')
[ -n "$hits" ] && violation "Convention: non-pnpm lockfile present" "$hits"

# Things that must never be committed.
hits=$(git diff --cached --name-only | grep -E '(^|/)\.env($|\.)|(^|/)node_modules/|(^|/)\.next/|supabase/\.temp/' | grep -v '\.env\.example$')
[ -n "$hits" ] && violation "Staged file that must not be committed (secrets / build output / caches)" "$hits"

# Dexie: schema changes are a new version() block + migration, never an edit.
if git diff --cached --quiet -- frontend/lib/db.ts; then :; else
  hits=$(git diff --cached -U0 -- frontend/lib/db.ts | grep -E '^-[^-]')
  [ -n "$hits" ] && review "Dexie: lines removed from lib/db.ts — confirm no existing version() block was edited" "$hits"
fi

[ $fail -eq 0 ] && echo "rules check: OK"
exit $fail
