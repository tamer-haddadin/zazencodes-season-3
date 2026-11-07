#!/usr/bin/env bash
# The repo's checks. Exit 0 only when the branch is fit to review.
#
# The factory runner executes the main checkout's copy of this script with the
# job's worktree as the working directory, after every build round and again
# right before merging, so a branch can't change the checks it is judged by.
# Keep it fast, deterministic and non-interactive: no watch modes, no prompts,
# nothing that rewrites files. Run it yourself from the project folder:
#
#   bash factory/checks.sh
set -euo pipefail

shopt -s nullglob
apps=(apps/*/package.json)
if [ ${#apps[@]} -eq 0 ]; then
  echo "no apps under apps/ yet; nothing to check"
  exit 0
fi

status=0
for pkg in "${apps[@]}"; do
  app=$(dirname "$pkg")
  echo "== $app"
  ( cd "$app" && node --check src/*.js && npm test --silent ) || status=1
done
exit $status
